import "server-only";
import type { OrderStatus } from "../../../../generated/prisma/client";
import type { BusinessActor } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction, type PrismaTx } from "@/server/db/transaction";
import { AppError, NotFoundError } from "@/server/http/errors";
import { orderDto, orderInclude } from "@/server/modules/orders/order.mapper";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";
async function releaseReservation(
  tx: PrismaTx,
  orderId: string,
  branchId: string,
  consume = false,
) {
  const movements = await tx.inventoryMovement.findMany({ where: { orderId } });
  const balances = new Map<string, any>();
  for (const m of movements)
    balances.set(
      m.ingredientId,
      (
        balances.get(m.ingredientId) ??
        new (
          await import("../../../../generated/prisma/client")
        ).Prisma.Decimal(0)
      ).plus(m.deltaReserved),
    );
  for (const [ingredientId, reserved] of balances)
    if (reserved.gt(0))
      await tx.inventoryMovement.create({
        data: {
          branchId,
          ingredientId,
          orderId,
          reason: consume ? "ORDER_CONSUMPTION" : "ORDER_RELEASE",
          deltaReserved: reserved.negated(),
          deltaOnHand: consume ? reserved.negated() : 0,
          reference: consume
            ? "Consumed during preparation"
            : "Released after cancellation",
        },
      });
}
async function customerProfile(userId: string) {
  const p = await getPrisma().customerProfile.findUnique({ where: { userId } });
  if (!p) throw new NotFoundError("Customer profile");
  return p;
}
async function transition(
  actorType: "CUSTOMER" | "BUSINESS",
  userId: string,
  where: any,
  from: OrderStatus[],
  to: OrderStatus,
  reason?: string,
) {
  return withTransaction({ actorType, userId }, async (tx) => {
    const current = await tx.order.findFirst({ where });
    if (!current) throw new NotFoundError("Order");
    if (!from.includes(current.status))
      throw new AppError(
        "ILLEGAL_ORDER_TRANSITION",
        `Order cannot move from ${current.status} to ${to}.`,
        409,
      );
    if (to === "CANCELLED" || to === "REJECTED")
      await releaseReservation(tx, current.id, current.branchId);
    if (to === "PREPARING")
      await releaseReservation(tx, current.id, current.branchId, true);
    const updated = await tx.order.update({
      where: { id: current.id },
      data: { status: to, cancellationReason: reason },
      include: orderInclude,
    });
    if (to === "READY" && updated.delivery) {
      await tx.orderDelivery.update({
        where: { orderId: updated.id },
        data: { status: "SEARCHING" },
      });
      const riders = await tx.riderProfile.findMany({
        where: {
          status: "AVAILABLE",
          lastLocationAt: { gte: new Date(Date.now() - 15 * 60000) },
        },
        take: 5,
        orderBy: { lastLocationAt: "desc" },
      });
      if (riders.length)
        await tx.riderAssignment.createMany({
          data: riders.map((r) => ({
            deliveryId: updated.delivery!.id,
            riderId: r.id,
            expiresAt: new Date(Date.now() + 5 * 60000),
          })),
          skipDuplicates: true,
        });
    }
    await outboxRepository.write(tx, {
      aggregateType: "Order",
      aggregateId: updated.id,
      eventType: `Order${to
        .split("_")
        .map((s) => s[0] + s.slice(1).toLowerCase())
        .join("")}`,
      payload: {
        orderId: updated.id,
        publicId: updated.publicId,
        branchId: updated.branchId,
        status: to,
      },
    });
    return orderDto(updated);
  });
}
export const customerOrderService = {
  async list(
    userId: string,
    q: { status?: OrderStatus; cursor?: string; limit: number },
  ) {
    const p = await customerProfile(userId);
    const rows = await getPrisma().order.findMany({
      where: { customerId: p.id, status: q.status },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { publicId: q.cursor }, skip: 1 } : {}),
      orderBy: { placedAt: "desc" },
      include: orderInclude,
    });
    const hasMore = rows.length > q.limit;
    const data = rows.slice(0, q.limit);
    return {
      items: data.map(orderDto),
      nextCursor: hasMore ? (data.at(-1)?.publicId ?? null) : null,
    };
  },
  async get(userId: string, publicId: string) {
    const p = await customerProfile(userId);
    const row = await getPrisma().order.findFirst({
      where: { publicId, customerId: p.id },
      include: orderInclude,
    });
    if (!row) throw new NotFoundError("Order");
    return orderDto(row);
  },
  async cancel(userId: string, publicId: string, reason: string) {
    const p = await customerProfile(userId);
    return transition(
      "CUSTOMER",
      userId,
      { publicId, customerId: p.id },
      ["PLACED", "CONFIRMED"],
      "CANCELLED",
      reason,
    );
  },
  async confirmPickup(userId: string, publicId: string) {
    const p = await customerProfile(userId);
    const row = await getPrisma().order.findFirst({
      where: { publicId, customerId: p.id },
    });
    if (!row) throw new NotFoundError("Order");
    if (row.fulfillmentType !== "PICKUP")
      throw new AppError(
        "NOT_PICKUP_ORDER",
        "Only pickup orders can be confirmed as collected.",
        422,
      );
    return transition(
      "CUSTOMER",
      userId,
      { id: row.id, customerId: p.id, fulfillmentType: "PICKUP" },
      ["READY"],
      "COMPLETED",
    );
  },
};
export const businessOrderService = {
  async list(
    actor: BusinessActor,
    branchId: string,
    q: { status?: OrderStatus; cursor?: string; limit: number },
  ) {
    const rows = await getPrisma().order.findMany({
      where: { branchId, status: q.status },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { publicId: q.cursor }, skip: 1 } : {}),
      orderBy: { placedAt: "desc" },
      include: orderInclude,
    });
    const more = rows.length > q.limit,
      data = rows.slice(0, q.limit);
    return {
      items: data.map(orderDto),
      nextCursor: more ? (data.at(-1)?.publicId ?? null) : null,
    };
  },
  async get(actor: BusinessActor, branchId: string, publicId: string) {
    const row = await getPrisma().order.findFirst({
      where: { publicId, branchId },
      include: orderInclude,
    });
    if (!row) throw new NotFoundError("Order");
    return orderDto(row);
  },
  confirm: (a: BusinessActor, b: string, p: string) =>
    transition(
      "BUSINESS",
      a.userId,
      { publicId: p, branchId: b },
      ["PLACED"],
      "CONFIRMED",
    ),
  reject: (a: BusinessActor, b: string, p: string, r: string) =>
    transition(
      "BUSINESS",
      a.userId,
      { publicId: p, branchId: b },
      ["PLACED"],
      "REJECTED",
      r,
    ),
  prepare: (a: BusinessActor, b: string, p: string) =>
    transition(
      "BUSINESS",
      a.userId,
      { publicId: p, branchId: b },
      ["CONFIRMED"],
      "PREPARING",
    ),
  ready: (a: BusinessActor, b: string, p: string) =>
    transition(
      "BUSINESS",
      a.userId,
      { publicId: p, branchId: b },
      ["PREPARING"],
      "READY",
    ),
  cancel: (a: BusinessActor, b: string, p: string, r: string) =>
    transition(
      "BUSINESS",
      a.userId,
      { publicId: p, branchId: b },
      ["PLACED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"],
      "CANCELLED",
      r,
    ),
  completePickup: async (a: BusinessActor, b: string, p: string) => {
    const row = await getPrisma().order.findFirst({
      where: { publicId: p, branchId: b },
    });
    if (!row) throw new NotFoundError("Order");
    if (row.fulfillmentType !== "PICKUP")
      throw new AppError(
        "NOT_PICKUP_ORDER",
        "Only pickup orders can use this command.",
        422,
      );
    return transition(
      "BUSINESS",
      a.userId,
      { id: row.id },
      ["READY"],
      "COMPLETED",
    );
  },
};
