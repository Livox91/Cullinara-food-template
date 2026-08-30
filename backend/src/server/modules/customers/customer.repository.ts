import "server-only";
import { getPrisma } from "@/server/db/prisma";
import type { PrismaTx } from "@/server/db/transaction";
import type {
  AddressInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from "@/server/modules/customers/customer.schemas";
export const customerRepository = {
  profile: (userId: string) =>
    getPrisma().customerProfile.findUnique({
      where: { userId },
      include: { user: true },
    }),
  addresses: (userId: string) =>
    getPrisma().customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  address: (userId: string, id: string) =>
    getPrisma().customerAddress.findFirst({ where: { id, userId } }),
  updateProfile: (tx: PrismaTx, userId: string, input: UpdateProfileInput) =>
    tx.customerProfile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
      include: { user: true },
    }),
  createAddress: (tx: PrismaTx, userId: string, input: AddressInput) =>
    tx.customerAddress.create({ data: { userId, ...input } }),
  updateAddress: (tx: PrismaTx, id: string, input: UpdateAddressInput) =>
    tx.customerAddress.update({ where: { id }, data: input }),
};
