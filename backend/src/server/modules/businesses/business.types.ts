import type {
  BusinessStatus,
  MembershipRole,
  MembershipStatus,
} from "../../../../generated/prisma/client";

export interface BusinessDto {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  status: BusinessStatus;
  defaultCurrency: string;
  timezone: string;
  taxRegistrationNo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMemberDto {
  id: string;
  businessId: string;
  user: { id: string; email: string | null; phone: string | null };
  role: MembershipRole;
  status: MembershipStatus;
  branchIds: string[];
  createdAt: string;
  updatedAt: string;
}
