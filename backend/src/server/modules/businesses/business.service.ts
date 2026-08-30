import "server-only";
import type { Prisma } from "../../../../generated/prisma/client";
import type { BusinessActor } from "@/server/auth/authorization";
import { requireActiveUser } from "@/server/auth/authorization";
import type { Principal } from "@/server/auth/principal";
import { withTransaction } from "@/server/db/transaction";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/server/http/errors";
import { auditRepository } from "@/server/modules/audit/audit.repository";
import {
  toBusinessDto,
  toBusinessMemberDto,
} from "@/server/modules/businesses/business.mapper";
import { businessRepository } from "@/server/modules/businesses/business.repository";
import type {
  ChangeMemberRoleInput,
  CreateBusinessInput,
  InviteMemberInput,
  SetMemberBranchAccessInput,
  UpdateBusinessInput,
} from "@/server/modules/businesses/business.schemas";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";

async function lockBusiness(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId}))::text AS lock_result`;
}

export const businessService = {
  async listMyBusinesses(principal: Principal) {
    await requireActiveUser(principal);
    return (await businessRepository.listForUser(principal.userId)).map(
      (membership) => ({
        business: toBusinessDto(membership.business),
        membership: {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          branchIds: membership.branchAccess.map(({ branchId }) => branchId),
        },
      }),
    );
  },

  async createBusiness(
    principal: Principal,
    input: CreateBusinessInput,
    requestId: string,
  ) {
    await requireActiveUser(principal);
    try {
      const business = await withTransaction(
        { actorType: "BUSINESS", userId: principal.userId },
        async (tx) => {
          const created = await businessRepository.createWithOwner(
            tx,
            principal.userId,
            input,
          );
          const after = toBusinessDto(created);
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: principal.userId,
            businessId: created.id,
            action: "business.create",
            entityType: "Business",
            entityId: created.id,
            after,
            requestId,
          });
          await outboxRepository.write(tx, {
            aggregateType: "Business",
            aggregateId: created.id,
            eventType: "BusinessCreated",
            payload: { businessId: created.id, ownerUserId: principal.userId },
          });
          return created;
        },
      );
      return toBusinessDto(business);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictError(
          "BUSINESS_SLUG_EXISTS",
          "That business slug is already in use.",
        );
      }
      throw error;
    }
  },

  async getBusiness(actor: BusinessActor) {
    const business = await businessRepository.findById(actor.businessId);
    if (!business) throw new NotFoundError("Business");
    return toBusinessDto(business);
  },

  async updateBusiness(
    actor: BusinessActor,
    input: UpdateBusinessInput,
    requestId: string,
  ) {
    try {
      const updated = await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          await lockBusiness(tx, actor.businessId);
          const existing = await tx.business.findUnique({
            where: { id: actor.businessId },
          });
          if (!existing) throw new NotFoundError("Business");
          const business = await businessRepository.update(
            tx,
            actor.businessId,
            input,
          );
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: actor.userId,
            businessId: actor.businessId,
            action: "business.update",
            entityType: "Business",
            entityId: actor.businessId,
            before: toBusinessDto(existing),
            after: toBusinessDto(business),
            requestId,
          });
          return business;
        },
      );
      return toBusinessDto(updated);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictError(
          "BUSINESS_SLUG_EXISTS",
          "That business slug is already in use.",
        );
      }
      throw error;
    }
  },

  async listMembers(actor: BusinessActor) {
    return (await businessRepository.listMembers(actor.businessId)).map(
      toBusinessMemberDto,
    );
  },

  async inviteMember(
    actor: BusinessActor,
    input: InviteMemberInput,
    requestId: string,
  ) {
    const identity = await businessRepository.findIdentity(input);
    if (!identity || identity.status !== "ACTIVE") {
      throw new NotFoundError("Active user identity");
    }

    try {
      const membership = await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          await lockBusiness(tx, actor.businessId);
          const created = await businessRepository.inviteMember(
            tx,
            actor.businessId,
            identity.id,
            input.role,
          );
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: actor.userId,
            businessId: actor.businessId,
            action: "business.member.invite",
            entityType: "BusinessMembership",
            entityId: created.id,
            after: toBusinessMemberDto(created),
            requestId,
          });
          await outboxRepository.write(tx, {
            aggregateType: "BusinessMembership",
            aggregateId: created.id,
            eventType: "BusinessMemberInvited",
            payload: {
              businessId: actor.businessId,
              membershipId: created.id,
              userId: identity.id,
            },
          });
          return created;
        },
      );
      return toBusinessMemberDto(membership);
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictError(
          "MEMBERSHIP_ALREADY_EXISTS",
          "This user already has a membership for the business.",
        );
      }
      throw error;
    }
  },

  async changeMemberRole(
    actor: BusinessActor,
    membershipId: string,
    input: ChangeMemberRoleInput,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const target = await businessRepository.findMemberForUpdate(
          tx,
          actor.businessId,
          membershipId,
        );
        if (!target) throw new NotFoundError("Business membership");
        if (
          (target.role === "OWNER" || input.role === "OWNER") &&
          actor.role !== "OWNER"
        ) {
          throw new ForbiddenError("Only an owner can change ownership roles.");
        }
        if (
          target.role === "OWNER" &&
          input.role !== "OWNER" &&
          target.status === "ACTIVE"
        ) {
          if (
            (await businessRepository.countActiveOwners(
              tx,
              actor.businessId,
            )) <= 1
          ) {
            throw new ConflictError(
              "LAST_OWNER_REQUIRED",
              "The last active owner cannot be downgraded.",
            );
          }
        }

        const updated = await businessRepository.changeRole(
          tx,
          membershipId,
          input.role,
        );
        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: actor.userId,
          businessId: actor.businessId,
          action: "business.member.role.change",
          entityType: "BusinessMembership",
          entityId: membershipId,
          before: toBusinessMemberDto(target),
          after: toBusinessMemberDto(updated),
          requestId,
        });
        return toBusinessMemberDto(updated);
      },
    );
  },

  async revokeMember(
    actor: BusinessActor,
    membershipId: string,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const target = await businessRepository.findMemberForUpdate(
          tx,
          actor.businessId,
          membershipId,
        );
        if (!target) throw new NotFoundError("Business membership");
        if (target.userId === actor.userId) {
          throw new ConflictError(
            "SELF_REVOCATION_FORBIDDEN",
            "You cannot revoke your own membership.",
          );
        }
        if (target.role === "OWNER") {
          if (actor.role !== "OWNER")
            throw new ForbiddenError("Only an owner can revoke another owner.");
          if (
            target.status === "ACTIVE" &&
            (await businessRepository.countActiveOwners(
              tx,
              actor.businessId,
            )) <= 1
          ) {
            throw new ConflictError(
              "LAST_OWNER_REQUIRED",
              "The last active owner cannot be revoked.",
            );
          }
        }

        const revoked = await businessRepository.revoke(tx, membershipId);
        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: actor.userId,
          businessId: actor.businessId,
          action: "business.member.revoke",
          entityType: "BusinessMembership",
          entityId: membershipId,
          before: toBusinessMemberDto(target),
          after: toBusinessMemberDto(revoked),
          requestId,
        });
        await outboxRepository.write(tx, {
          aggregateType: "BusinessMembership",
          aggregateId: membershipId,
          eventType: "BusinessMembershipRevoked",
          payload: { businessId: actor.businessId, membershipId },
        });
        return toBusinessMemberDto(revoked);
      },
    );
  },

  async setMemberBranchAccess(
    actor: BusinessActor,
    membershipId: string,
    input: SetMemberBranchAccessInput,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const target = await businessRepository.findMemberForUpdate(
          tx,
          actor.businessId,
          membershipId,
        );
        if (!target) throw new NotFoundError("Business membership");
        if (
          !(await businessRepository.assertBranchesBelongToBusiness(
            tx,
            actor.businessId,
            input,
          ))
        ) {
          throw new ConflictError(
            "CROSS_BUSINESS_BRANCH",
            "Every branch must belong to the selected business.",
          );
        }

        const updated = await businessRepository.setBranchAccess(
          tx,
          membershipId,
          input,
        );
        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: actor.userId,
          businessId: actor.businessId,
          action: "business.member.branches.replace",
          entityType: "BusinessMembership",
          entityId: membershipId,
          before: toBusinessMemberDto(target),
          after: toBusinessMemberDto(updated),
          requestId,
        });
        return toBusinessMemberDto(updated);
      },
    );
  },
};
