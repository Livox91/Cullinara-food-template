import "server-only";
import type {
  ActorType,
  Prisma,
  PrismaClient,
} from "../../../generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";

export type PrismaTx = Prisma.TransactionClient;

export interface TransactionActor {
  actorType: ActorType;
  userId?: string;
}

export async function withTransaction<T>(
  actor: TransactionActor,
  operation: (tx: PrismaTx) => Promise<T>,
  client: PrismaClient = getPrisma(),
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.actor_type', ${actor.actorType}, true)`;
    await tx.$executeRaw`SELECT set_config('app.user_id', ${actor.userId ?? ""}, true)`;
    return operation(tx);
  });
}
