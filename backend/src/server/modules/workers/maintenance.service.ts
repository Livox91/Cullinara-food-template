import "server-only";
import { getEnvironment } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { emailService } from "@/server/modules/notifications/email.service";
export const maintenanceService = {
  async run() {
    const now = new Date(),
      locationCutoff = new Date(now.getTime() - 30 * 86400000);
    const cleanup = await withTransaction(
      { actorType: "SYSTEM" },
      async (tx) => {
        const [carts, offers, keys, locations] = await Promise.all([
          tx.cart.updateMany({
            where: { status: "ACTIVE", expiresAt: { lt: now } },
            data: { status: "ABANDONED" },
          }),
          tx.riderAssignment.updateMany({
            where: { status: "OFFERED", expiresAt: { lt: now } },
            data: { status: "EXPIRED" },
          }),
          tx.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } }),
          tx.riderLocationPing.deleteMany({
            where: { recordedAt: { lt: locationCutoff } },
          }),
        ]);
        return {
          abandonedCarts: carts.count,
          expiredOffers: offers.count,
          deletedIdempotencyKeys: keys.count,
          deletedLocationPings: locations.count,
        };
      },
    );
    const delivery = await this.publishOutbox();
    return { cleanup, outbox: delivery };
  },
  async publishOutbox(eventTypes?: string[], aggregateId?: string) {
    const env = getEnvironment(),
      events = await getPrisma().outboxEvent.findMany({
        where: {
          publishedAt: null,
          availableAt: { lte: new Date() },
          ...(eventTypes?.length ? { eventType: { in: eventTypes } } : {}),
          ...(aggregateId ? { aggregateId } : {}),
        },
        take: 50,
        orderBy: { createdAt: "asc" },
      });
    let published = 0,
      failed = 0;
    for (const event of events) {
      try {
        if (emailService.supports(event)) {
          await emailService.deliver(event);
        } else {
          if (!env.NOTIFICATION_WEBHOOK_URL)
            throw new Error("NOTIFICATION_WEBHOOK_URL is not configured");
          const response = await fetch(env.NOTIFICATION_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(env.WORKER_SECRET
                ? { authorization: `Bearer ${env.WORKER_SECRET}` }
                : {}),
            },
            body: JSON.stringify({
              id: event.id,
              type: event.eventType,
              aggregateType: event.aggregateType,
              aggregateId: event.aggregateId,
              payload: event.payload,
              createdAt: event.createdAt.toISOString(),
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok)
            throw new Error(`Notification endpoint returned ${response.status}`);
        }
        await getPrisma().outboxEvent.update({
          where: { id: event.id },
          data: {
            publishedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
          },
        });
        published++;
      } catch (error) {
        await getPrisma().outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Unknown publisher error",
            availableAt: new Date(Date.now() + 60000),
          },
        });
        failed++;
      }
    }
    return { selected: events.length, published, failed };
  },
};
