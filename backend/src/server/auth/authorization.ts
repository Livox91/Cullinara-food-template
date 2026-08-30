import "server-only";
import type { MembershipRole } from "../../../generated/prisma/client";
import type { Principal } from "@/server/auth/principal";
import { getPrisma } from "@/server/db/prisma";
import { ForbiddenError, UnauthorizedError } from "@/server/http/errors";

export type BusinessCapability =
  | "business.read"
  | "business.manage"
  | "member.manage"
  | "branch.manage"
  | "menu.manage"
  | "order.read"
  | "order.confirm"
  | "order.prepare"
  | "order.cancel"
  | "inventory.manage"
  | "payment.manage"
  | "audit.read"
  | "support.manage";

const ROLE_CAPABILITIES: Record<
  MembershipRole,
  ReadonlySet<BusinessCapability> | "all"
> = {
  OWNER: "all",
  ADMIN: "all",
  MANAGER: new Set([
    "business.read",
    "branch.manage",
    "menu.manage",
    "order.read",
    "order.confirm",
    "order.prepare",
    "order.cancel",
    "inventory.manage",
  ]),
  CASHIER: new Set([
    "business.read",
    "order.read",
    "order.confirm",
    "payment.manage",
  ]),
  KITCHEN: new Set(["business.read", "order.read", "order.prepare"]),
  SUPPORT: new Set([
    "business.read",
    "order.read",
    "order.cancel",
    "support.manage",
  ]),
};

export interface BusinessActor {
  userId: string;
  membershipId: string;
  businessId: string;
  branchId?: string;
  role: MembershipRole;
  capability: BusinessCapability;
}

interface BusinessActorInput {
  businessId: string;
  branchId?: string;
  capability: BusinessCapability;
}

export async function requireActiveUser(principal: Principal): Promise<void> {
  const user = await getPrisma().user.findUnique({
    where: { id: principal.userId },
    select: { status: true },
  });
  if (!user || user.status !== "ACTIVE")
    throw new UnauthorizedError("The account is not active.");
}

export async function requireBusinessActor(
  principal: Principal,
  input: BusinessActorInput,
): Promise<BusinessActor> {
  await requireActiveUser(principal);

  const membership = await getPrisma().businessMembership.findUnique({
    where: {
      businessId_userId: {
        businessId: input.businessId,
        userId: principal.userId,
      },
    },
    include: { branchAccess: { select: { branchId: true } } },
  });

  if (!membership || membership.status !== "ACTIVE") throw new ForbiddenError();
  const capabilities = ROLE_CAPABILITIES[membership.role];
  if (capabilities !== "all" && !capabilities.has(input.capability))
    throw new ForbiddenError();

  if (
    input.branchId &&
    membership.role !== "OWNER" &&
    membership.role !== "ADMIN"
  ) {
    const canAccessBranch = membership.branchAccess.some(
      ({ branchId }) => branchId === input.branchId,
    );
    if (!canAccessBranch)
      throw new ForbiddenError("You do not have access to this branch.");
  }

  return {
    userId: principal.userId,
    membershipId: membership.id,
    businessId: membership.businessId,
    branchId: input.branchId,
    role: membership.role,
    capability: input.capability,
  };
}
