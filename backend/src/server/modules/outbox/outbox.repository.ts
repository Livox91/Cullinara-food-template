import "server-only";
import type { Prisma } from "../../../../generated/prisma/client";
import type { PrismaTx } from "@/server/db/transaction";

export interface OutboxMessage {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  availableAt?: Date;
}

export const outboxRepository = {
  async write(tx: PrismaTx, message: OutboxMessage) {
    return tx.outboxEvent.create({
      data: {
        aggregateType: message.aggregateType,
        aggregateId: message.aggregateId,
        eventType: message.eventType,
        payload: message.payload,
        availableAt: message.availableAt,
      },
    });
  },
};
