import "server-only";
import { withTransaction } from "@/server/db/transaction";
import { NotFoundError } from "@/server/http/errors";
import {
  addressDto,
  profileDto,
} from "@/server/modules/customers/customer.mapper";
import { customerRepository } from "@/server/modules/customers/customer.repository";
import type {
  AddressInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from "@/server/modules/customers/customer.schemas";
export const customerService = {
  async getProfile(userId: string) {
    const p = await customerRepository.profile(userId);
    if (!p) throw new NotFoundError("Customer profile");
    return profileDto(p);
  },
  async updateProfile(userId: string, input: UpdateProfileInput) {
    return profileDto(
      await withTransaction({ actorType: "CUSTOMER", userId }, (tx) =>
        customerRepository.updateProfile(tx, userId, input),
      ),
    );
  },
  async listAddresses(userId: string) {
    return (await customerRepository.addresses(userId)).map(addressDto);
  },
  async createAddress(userId: string, input: AddressInput) {
    return addressDto(
      await withTransaction({ actorType: "CUSTOMER", userId }, async (tx) => {
        if (input.isDefault)
          await tx.customerAddress.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        return customerRepository.createAddress(tx, userId, input);
      }),
    );
  },
  async updateAddress(userId: string, id: string, input: UpdateAddressInput) {
    if (!(await customerRepository.address(userId, id)))
      throw new NotFoundError("Address");
    return addressDto(
      await withTransaction({ actorType: "CUSTOMER", userId }, async (tx) => {
        if (input.isDefault)
          await tx.customerAddress.updateMany({
            where: { userId, isDefault: true, id: { not: id } },
            data: { isDefault: false },
          });
        return customerRepository.updateAddress(tx, id, input);
      }),
    );
  },
  async removeAddress(userId: string, id: string) {
    if (!(await customerRepository.address(userId, id)))
      throw new NotFoundError("Address");
    await withTransaction({ actorType: "CUSTOMER", userId }, (tx) =>
      tx.customerAddress.delete({ where: { id } }),
    );
    return { deleted: true };
  },
  async setDefault(userId: string, id: string) {
    if (!(await customerRepository.address(userId, id)))
      throw new NotFoundError("Address");
    return addressDto(
      await withTransaction({ actorType: "CUSTOMER", userId }, async (tx) => {
        await tx.customerAddress.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
        return tx.customerAddress.update({
          where: { id },
          data: { isDefault: true },
        });
      }),
    );
  },
};
