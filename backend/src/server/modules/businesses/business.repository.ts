import "server-only";
import type { MembershipRole } from "../../../../generated/prisma/client";
import type { PrismaTx } from "@/server/db/transaction";
import { getPrisma } from "@/server/db/prisma";
import type {
  CreateBusinessInput,
  InviteMemberInput,
  SetMemberBranchAccessInput,
  UpdateBusinessInput,
} from "@/server/modules/businesses/business.schemas";

const memberInclude = {
  user: { select: { id: true, email: true, phone: true } },
  branchAccess: {
    select: { branchId: true },
    orderBy: { branchId: "asc" as const },
  },
} as const;

export const businessRepository = {
  listForUser(userId: string) {
    return getPrisma().businessMembership.findMany({
      where: { userId, status: { in: ["ACTIVE", "INVITED"] } },
      include: {
        business: true,
        branchAccess: { select: { branchId: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  createWithOwner(
    tx: PrismaTx,
    ownerUserId: string,
    input: CreateBusinessInput,
  ) {
    return tx.business.create({
      data: {
        ...input,
        memberships: {
          create: { userId: ownerUserId, role: "OWNER", status: "ACTIVE" },
        },
      },
    });
  },

  findById(id: string) {
    return getPrisma().business.findUnique({ where: { id } });
  },

  update(tx: PrismaTx, id: string, input: UpdateBusinessInput) {
    return tx.business.update({ where: { id }, data: input });
  },

  listMembers(businessId: string) {
    return getPrisma().businessMembership.findMany({
      where: { businessId },
      include: memberInclude,
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  },

  findIdentity(input: Pick<InviteMemberInput, "email" | "phone">) {
    const identifiers = [
      input.email ? { email: input.email } : undefined,
      input.phone ? { phone: input.phone } : undefined,
    ].filter(
      (identifier): identifier is { email: string } | { phone: string } =>
        Boolean(identifier),
    );
    return getPrisma().user.findFirst({
      where: { OR: identifiers },
      select: { id: true, status: true },
    });
  },

  inviteMember(
    tx: PrismaTx,
    businessId: string,
    userId: string,
    role: InviteMemberInput["role"],
  ) {
    return tx.businessMembership.create({
      data: { businessId, userId, role, status: "INVITED" },
      include: memberInclude,
    });
  },

  findMember(businessId: string, membershipId: string) {
    return getPrisma().businessMembership.findFirst({
      where: { id: membershipId, businessId },
      include: memberInclude,
    });
  },

  findMemberForUpdate(tx: PrismaTx, businessId: string, membershipId: string) {
    return tx.businessMembership.findFirst({
      where: { id: membershipId, businessId },
      include: memberInclude,
    });
  },

  countActiveOwners(tx: PrismaTx, businessId: string) {
    return tx.businessMembership.count({
      where: { businessId, role: "OWNER", status: "ACTIVE" },
    });
  },

  changeRole(tx: PrismaTx, membershipId: string, role: MembershipRole) {
    return tx.businessMembership.update({
      where: { id: membershipId },
      data: { role },
      include: memberInclude,
    });
  },

  revoke(tx: PrismaTx, membershipId: string) {
    return tx.businessMembership.update({
      where: { id: membershipId },
      data: { status: "REVOKED", branchAccess: { deleteMany: {} } },
      include: memberInclude,
    });
  },

  async assertBranchesBelongToBusiness(
    tx: PrismaTx,
    businessId: string,
    input: SetMemberBranchAccessInput,
  ) {
    const count = await tx.branch.count({
      where: { id: { in: input.branchIds }, businessId },
    });
    return count === input.branchIds.length;
  },

  setBranchAccess(
    tx: PrismaTx,
    membershipId: string,
    input: SetMemberBranchAccessInput,
  ) {
    return tx.businessMembership.update({
      where: { id: membershipId },
      data: {
        branchAccess: {
          deleteMany: {},
          createMany: {
            data: input.branchIds.map((branchId) => ({ branchId })),
          },
        },
      },
      include: memberInclude,
    });
  },
};
