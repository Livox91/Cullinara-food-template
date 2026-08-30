import type {
  Business,
  BusinessMembership,
  StaffBranchAccess,
  User,
} from "../../../../generated/prisma/client";
import type {
  BusinessDto,
  BusinessMemberDto,
} from "@/server/modules/businesses/business.types";

export function toBusinessDto(business: Business): BusinessDto {
  return {
    id: business.id,
    legalName: business.legalName,
    displayName: business.displayName,
    slug: business.slug,
    status: business.status,
    defaultCurrency: business.defaultCurrency,
    timezone: business.timezone,
    taxRegistrationNo: business.taxRegistrationNo,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

type MembershipWithUserAndBranches = BusinessMembership & {
  user: Pick<User, "id" | "email" | "phone">;
  branchAccess: Pick<StaffBranchAccess, "branchId">[];
};

export function toBusinessMemberDto(
  membership: MembershipWithUserAndBranches,
): BusinessMemberDto {
  return {
    id: membership.id,
    businessId: membership.businessId,
    user: membership.user,
    role: membership.role,
    status: membership.status,
    branchIds: membership.branchAccess.map(({ branchId }) => branchId),
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  };
}
