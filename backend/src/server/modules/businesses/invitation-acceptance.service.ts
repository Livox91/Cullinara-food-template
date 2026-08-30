import "server-only";
import type { Principal } from "@/server/auth/principal";
import { requireActiveUser } from "@/server/auth/authorization";
import { withTransaction } from "@/server/db/transaction";
import { ConflictError, NotFoundError } from "@/server/http/errors";
import { auditRepository } from "@/server/modules/audit/audit.repository";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";

function toInvitationDto(membership: {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: membership.id,
    businessId: membership.businessId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  };
}

export const invitationAcceptanceService = {
  async accept(principal: Principal, businessId: string, requestId: string) {
    await requireActiveUser(principal);

    return withTransaction(
      { actorType: "BUSINESS", userId: principal.userId },
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId}))::text AS lock_result`;

        const identity = await tx.user.findUnique({
          where: { id: principal.userId },
          select: { emailVerifiedAt: true, phoneVerifiedAt: true },
        });
        if (!identity) throw new NotFoundError("User identity");
        if (!identity.emailVerifiedAt && !identity.phoneVerifiedAt) {
          throw new ConflictError(
            "IDENTITY_VERIFICATION_REQUIRED",
            "Verify your email or phone before accepting a business invitation.",
          );
        }

        const invitation = await tx.businessMembership.findUnique({
          where: {
            businessId_userId: { businessId, userId: principal.userId },
          },
        });
        if (!invitation) throw new NotFoundError("Business invitation");
        if (invitation.status === "ACTIVE") return toInvitationDto(invitation);
        if (invitation.status !== "INVITED") {
          throw new ConflictError(
            "INVITATION_NOT_AVAILABLE",
            "This business invitation is no longer available.",
          );
        }

        const activated = await tx.businessMembership.updateMany({
          where: { id: invitation.id, status: "INVITED" },
          data: { status: "ACTIVE" },
        });
        if (activated.count !== 1) {
          throw new ConflictError(
            "INVITATION_ALREADY_HANDLED",
            "This business invitation was already handled.",
          );
        }

        const membership = await tx.businessMembership.findUnique({
          where: { id: invitation.id },
        });
        if (!membership) throw new NotFoundError("Business membership");
        const before = toInvitationDto(invitation);
        const after = toInvitationDto(membership);

        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: principal.userId,
          businessId,
          action: "business.member.invitation.accept",
          entityType: "BusinessMembership",
          entityId: membership.id,
          before,
          after,
          requestId,
        });
        await outboxRepository.write(tx, {
          aggregateType: "BusinessMembership",
          aggregateId: membership.id,
          eventType: "BusinessMemberInvitationAccepted",
          payload: {
            businessId,
            membershipId: membership.id,
            userId: principal.userId,
            role: membership.role,
            acceptedAt: membership.updatedAt.toISOString(),
            requestId,
          },
        });

        return after;
      },
    );
  },
};
