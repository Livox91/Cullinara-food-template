import "server-only";
import type { ActorType, Prisma } from "../../../../generated/prisma/client";
import type { PrismaTx } from "@/server/db/transaction";

export interface AuditEntry {
  businessId?: string;
  actorUserId?: string;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export const auditRepository = {
  async write(tx: PrismaTx, entry: AuditEntry) {
    const before =
      entry.before === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(entry.before)) as Prisma.InputJsonValue);
    const after =
      entry.after === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(entry.after)) as Prisma.InputJsonValue);
    return tx.auditLog.create({ data: { ...entry, before, after } });
  },
};
