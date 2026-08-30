import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { AppError, NotFoundError } from "@/server/http/errors";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";
const dto = (r: any) => ({
  id: r.id,
  userId: r.userId,
  status: r.status,
  vehicleType: r.vehicleType,
  vehiclePlate: r.vehiclePlate,
  currentLatitude: r.currentLatitude?.toString() ?? null,
  currentLongitude: r.currentLongitude?.toString() ?? null,
  lastLocationAt: r.lastLocationAt?.toISOString() ?? null,
});
async function profile(userId: string) {
  const r = await getPrisma().riderProfile.findUnique({ where: { userId } });
  if (!r) throw new NotFoundError("Rider profile");
  if (r.status === "SUSPENDED")
    throw new AppError(
      "RIDER_SUSPENDED",
      "The rider profile is suspended.",
      403,
    );
  return r;
}
const assignmentInclude = {
  delivery: { include: { order: { include: { branch: true } } } },
  history: { orderBy: { createdAt: "asc" as const } },
} as const;
const assignmentDto = (a: any) => ({
  id: a.id,
  status: a.status,
  offeredAt: a.offeredAt.toISOString(),
  expiresAt: a.expiresAt?.toISOString() ?? null,
  delivery: {
    id: a.delivery.id,
    status: a.delivery.status,
    recipientName: a.delivery.recipientName,
    recipientPhone: a.delivery.recipientPhone,
    addressLine1: a.delivery.addressLine1,
    city: a.delivery.city,
    latitude: a.delivery.latitude.toString(),
    longitude: a.delivery.longitude.toString(),
    order: {
      publicId: a.delivery.order.publicId,
      orderNumber: a.delivery.order.orderNumber?.toString(),
      branch: a.delivery.order.branch,
    },
  },
});
export const riderService = {
  async enroll(
    userId: string,
    x: { vehicleType: string; vehiclePlate: string },
  ) {
    const user = await getPrisma().user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });
    if (!user) throw new NotFoundError("User");
    if (!user.emailVerifiedAt && !user.phoneVerifiedAt)
      throw new AppError(
        "IDENTITY_NOT_VERIFIED",
        "Verify an email address or phone number before rider enrollment.",
        403,
      );
    if (user.riderProfile) return dto(user.riderProfile);
    return dto(
      await getPrisma().riderProfile.create({ data: { userId, ...x } }),
    );
  },
  async me(userId: string) {
    return dto(await profile(userId));
  },
  async status(userId: string, status: "OFFLINE" | "AVAILABLE") {
    const p = await profile(userId);
    if (p.status === "BUSY")
      throw new AppError(
        "RIDER_BUSY",
        "A busy rider cannot change availability.",
        409,
      );
    return dto(
      await getPrisma().riderProfile.update({
        where: { id: p.id },
        data: { status },
      }),
    );
  },
  async vehicle(userId: string, x: any) {
    const p = await profile(userId);
    return dto(
      await getPrisma().riderProfile.update({ where: { id: p.id }, data: x }),
    );
  },
  async location(userId: string, x: any) {
    const p = await profile(userId);
    if (
      x.deliveryId &&
      !(await getPrisma().riderAssignment.findFirst({
        where: {
          riderId: p.id,
          deliveryId: x.deliveryId,
          status: { in: ["ACCEPTED", "PICKED_UP"] },
        },
      }))
    )
      throw new AppError(
        "INVALID_DELIVERY",
        "The delivery is not assigned to this rider.",
        403,
      );
    await withTransaction({ actorType: "RIDER", userId }, async (tx) => {
      await tx.riderLocationPing.create({ data: { riderId: p.id, ...x } });
      await tx.riderProfile.update({
        where: { id: p.id },
        data: {
          currentLatitude: x.latitude,
          currentLongitude: x.longitude,
          lastLocationAt: x.recordedAt,
        },
      });
    });
    return { recorded: true, recordedAt: x.recordedAt.toISOString() };
  },
  async current(userId: string) {
    const p = await profile(userId);
    const a = await getPrisma().riderAssignment.findFirst({
      where: { riderId: p.id, status: { in: ["ACCEPTED", "PICKED_UP"] } },
      include: assignmentInclude,
    });
    return a ? assignmentDto(a) : null;
  },
  async offers(userId: string) {
    const p = await profile(userId);
    await getPrisma().riderAssignment.updateMany({
      where: {
        riderId: p.id,
        status: "OFFERED",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    return (
      await getPrisma().riderAssignment.findMany({
        where: {
          riderId: p.id,
          status: "OFFERED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: assignmentInclude,
        orderBy: { offeredAt: "desc" },
      })
    ).map(assignmentDto);
  },
  async accept(userId: string, id: string) {
    const p = await profile(userId);
    return withTransaction({ actorType: "RIDER", userId }, async (tx) => {
      const a = await tx.riderAssignment.findFirst({
        where: { id, riderId: p.id },
        include: assignmentInclude,
      });
      if (!a) throw new NotFoundError("Rider assignment");
      if (a.status !== "OFFERED" || (a.expiresAt && a.expiresAt < new Date()))
        throw new AppError(
          "OFFER_NOT_AVAILABLE",
          "The offer is no longer available.",
          409,
        );
      const updated = await tx.riderAssignment.update({
        where: { id },
        data: { status: "ACCEPTED" },
        include: assignmentInclude,
      });
      await tx.riderAssignment.updateMany({
        where: { deliveryId: a.deliveryId, id: { not: id }, status: "OFFERED" },
        data: { status: "CANCELLED" },
      });
      await tx.orderDelivery.update({
        where: { id: a.deliveryId },
        data: { status: "ASSIGNED" },
      });
      await tx.riderProfile.update({
        where: { id: p.id },
        data: { status: "BUSY" },
      });
      await outboxRepository.write(tx, {
        aggregateType: "Delivery",
        aggregateId: a.deliveryId,
        eventType: "RiderAssigned",
        payload: { assignmentId: id, riderId: p.id, deliveryId: a.deliveryId },
      });
      return assignmentDto(updated);
    });
  },
  async reject(userId: string, id: string) {
    const p = await profile(userId);
    const a = await getPrisma().riderAssignment.findFirst({
      where: { id, riderId: p.id, status: "OFFERED" },
    });
    if (!a) throw new NotFoundError("Rider offer");
    await getPrisma().riderAssignment.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    return { rejected: true };
  },
  async pickedUp(userId: string, id: string) {
    const p = await profile(userId);
    return withTransaction({ actorType: "RIDER", userId }, async (tx) => {
      const a = await tx.riderAssignment.findFirst({
        where: { id, riderId: p.id, status: "ACCEPTED" },
        include: assignmentInclude,
      });
      if (!a) throw new NotFoundError("Accepted assignment");
      await tx.riderAssignment.update({
        where: { id },
        data: { status: "PICKED_UP" },
      });
      await tx.orderDelivery.update({
        where: { id: a.deliveryId },
        data: { status: "PICKED_UP", pickedUpAt: new Date() },
      });
      await tx.order.update({
        where: { id: a.delivery.order.id },
        data: { status: "OUT_FOR_DELIVERY" },
      });
      await outboxRepository.write(tx, {
        aggregateType: "Delivery",
        aggregateId: a.deliveryId,
        eventType: "OrderPickedUp",
        payload: { assignmentId: id },
      });
      return { pickedUp: true };
    });
  },
  async delivered(userId: string, id: string) {
    const p = await profile(userId);
    return withTransaction({ actorType: "RIDER", userId }, async (tx) => {
      const a = await tx.riderAssignment.findFirst({
        where: { id, riderId: p.id, status: "PICKED_UP" },
        include: assignmentInclude,
      });
      if (!a) throw new NotFoundError("Picked-up assignment");
      await tx.riderAssignment.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
      await tx.orderDelivery.update({
        where: { id: a.deliveryId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      await tx.order.update({
        where: { id: a.delivery.order.id },
        data: { status: "COMPLETED" },
      });
      const cod = await tx.payment.findFirst({
        where: {
          orderId: a.delivery.order.id,
          method: "CASH_ON_DELIVERY",
          status: "PENDING",
        },
      });
      if (cod) {
        await tx.payment.update({
          where: { id: cod.id },
          data: { status: "CAPTURED", capturedAt: new Date() },
        });
        await tx.order.update({
          where: { id: a.delivery.order.id },
          data: { paymentStatus: "CAPTURED" },
        });
      }
      await tx.riderProfile.update({
        where: { id: p.id },
        data: { status: "AVAILABLE" },
      });
      await outboxRepository.write(tx, {
        aggregateType: "Delivery",
        aggregateId: a.deliveryId,
        eventType: "OrderDelivered",
        payload: { assignmentId: id },
      });
      return { delivered: true };
    });
  },
};
