import "server-only";
import type { BusinessActor } from "@/server/auth/authorization";
import { withTransaction, type PrismaTx } from "@/server/db/transaction";
import {
  ConflictError,
  NotFoundError,
} from "@/server/http/errors";
import { auditRepository } from "@/server/modules/audit/audit.repository";
import {
  toBranchDto,
  toBranchHoursDto,
} from "@/server/modules/branches/branch.mapper";
import { branchRepository } from "@/server/modules/branches/branch.repository";
import type {
  CreateBranchInput,
  ReplaceWeeklyHoursInput,
  SetOrderAcceptanceInput,
  UpdateBranchInput,
  UpsertSpecialHoursInput,
} from "@/server/modules/branches/branch.schemas";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";

async function lockBusiness(tx: PrismaTx, businessId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${businessId}))::text AS lock_result`;
}

export const branchService = {
  async list(actor: BusinessActor) {
    const branches = await branchRepository.listAccessible(actor);
    return branches.map((branch) => toBranchDto(branch));
  },

  async get(actor: BusinessActor, branchId: string) {
    const branch = await branchRepository.findById(actor.businessId, branchId);
    if (!branch) throw new NotFoundError("Branch");
    return toBranchDto(branch);
  },

  async create(
    actor: BusinessActor,
    input: CreateBranchInput,
    requestId: string,
  ) {
    // The route has already required branch.manage. Keep authorization in the
    // capability policy so managers are not offered an action that is then
    // rejected by a second, contradictory role check.
    try {
      return await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          await lockBusiness(tx, actor.businessId);
          const branch = await branchRepository.create(
            tx,
            actor.businessId,
            input,
          );
          const after = toBranchDto(branch);
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: actor.userId,
            businessId: actor.businessId,
            action: "branch.create",
            entityType: "Branch",
            entityId: branch.id,
            after,
            requestId,
          });
          await outboxRepository.write(tx, {
            aggregateType: "Branch",
            aggregateId: branch.id,
            eventType: "BranchCreated",
            payload: {
              businessId: actor.businessId,
              branchId: branch.id,
              requestId,
            },
          });
          return after;
        },
      );
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictError(
          "BRANCH_CODE_EXISTS",
          "That branch code is already used by this business.",
        );
      }
      throw error;
    }
  },

  async update(
    actor: BusinessActor,
    branchId: string,
    input: UpdateBranchInput,
    requestId: string,
  ) {
    try {
      return await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          await lockBusiness(tx, actor.businessId);
          const existing = await branchRepository.findByIdInTransaction(
            tx,
            actor.businessId,
            branchId,
          );
          if (!existing) throw new NotFoundError("Branch");
          const branch = await branchRepository.update(tx, branchId, input);
          const before = toBranchDto(existing);
          const after = toBranchDto(branch);
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: actor.userId,
            businessId: actor.businessId,
            action: "branch.update",
            entityType: "Branch",
            entityId: branchId,
            before,
            after,
            requestId,
          });
          return after;
        },
      );
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ConflictError(
          "BRANCH_CODE_EXISTS",
          "That branch code is already used by this business.",
        );
      }
      throw error;
    }
  },

  async setOrderAcceptance(
    actor: BusinessActor,
    branchId: string,
    input: SetOrderAcceptanceInput,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const existing = await branchRepository.findByIdInTransaction(
          tx,
          actor.businessId,
          branchId,
        );
        if (!existing) throw new NotFoundError("Branch");
        const branch = await branchRepository.setOrderAcceptance(
          tx,
          branchId,
          input.isAcceptingOrders,
        );
        const before = toBranchDto(existing);
        const after = toBranchDto(branch);
        if (before.isAcceptingOrders !== after.isAcceptingOrders) {
          await auditRepository.write(tx, {
            actorType: "BUSINESS",
            actorUserId: actor.userId,
            businessId: actor.businessId,
            action: "branch.order-acceptance.change",
            entityType: "Branch",
            entityId: branchId,
            before: { isAcceptingOrders: before.isAcceptingOrders },
            after: { isAcceptingOrders: after.isAcceptingOrders },
            requestId,
          });
          await outboxRepository.write(tx, {
            aggregateType: "Branch",
            aggregateId: branchId,
            eventType: "BranchOrderAcceptanceChanged",
            payload: {
              businessId: actor.businessId,
              branchId,
              isAcceptingOrders: after.isAcceptingOrders,
              requestId,
            },
          });
        }
        return after;
      },
    );
  },

  async getHours(actor: BusinessActor, branchId: string) {
    const branch = await branchRepository.findById(actor.businessId, branchId);
    if (!branch) throw new NotFoundError("Branch");
    return toBranchHoursDto(branch);
  },

  async replaceWeeklyHours(
    actor: BusinessActor,
    branchId: string,
    input: ReplaceWeeklyHoursInput,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const existing = await branchRepository.findByIdInTransaction(
          tx,
          actor.businessId,
          branchId,
        );
        if (!existing) throw new NotFoundError("Branch");
        const branch = await branchRepository.replaceWeeklyHours(
          tx,
          branchId,
          input,
        );
        const before = toBranchHoursDto(existing);
        const after = toBranchHoursDto(branch);
        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: actor.userId,
          businessId: actor.businessId,
          action: "branch.hours.replace",
          entityType: "Branch",
          entityId: branchId,
          before,
          after,
          requestId,
        });
        await outboxRepository.write(tx, {
          aggregateType: "Branch",
          aggregateId: branchId,
          eventType: "BranchHoursChanged",
          payload: { businessId: actor.businessId, branchId, requestId },
        });
        return after;
      },
    );
  },

  async upsertSpecialHours(
    actor: BusinessActor,
    branchId: string,
    input: UpsertSpecialHoursInput,
    requestId: string,
  ) {
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        await lockBusiness(tx, actor.businessId);
        const existing = await branchRepository.findByIdInTransaction(
          tx,
          actor.businessId,
          branchId,
        );
        if (!existing) throw new NotFoundError("Branch");
        const branch = await branchRepository.upsertSpecialHours(
          tx,
          branchId,
          input,
        );
        const after = toBranchHoursDto(branch);
        await auditRepository.write(tx, {
          actorType: "BUSINESS",
          actorUserId: actor.userId,
          businessId: actor.businessId,
          action: "branch.special-hours.upsert",
          entityType: "BranchSpecialHour",
          entityId: `${branchId}:${input.date}`,
          before: toBranchHoursDto(existing),
          after,
          requestId,
        });
        await outboxRepository.write(tx, {
          aggregateType: "Branch",
          aggregateId: branchId,
          eventType: "BranchSpecialHoursChanged",
          payload: {
            businessId: actor.businessId,
            branchId,
            date: input.date,
            requestId,
          },
        });
        return after;
      },
    );
  },
};
