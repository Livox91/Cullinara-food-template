import "server-only";
import type { BusinessActor } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { ForbiddenError } from "@/server/http/errors";
async function branchScope(actor: BusinessActor) {
  if (actor.role === "OWNER" || actor.role === "ADMIN") return undefined;
  const membership = await getPrisma().businessMembership.findUnique({
    where: { id: actor.membershipId },
    include: { branchAccess: true },
  });
  const ids = membership?.branchAccess.map((x) => x.branchId) ?? [];
  return ids.length > 0 ? ids : undefined;
}
export const operationsService = {
  async dashboard(actor: BusinessActor) {
    const ids = await branchScope(actor),
      where = {
        branch: { businessId: actor.businessId },
        ...(ids ? { branchId: { in: ids } } : {}),
      },
      today = new Date();
    today.setHours(0, 0, 0, 0);
    const [statuses, todayTotals, activeOrders, inventory, reviews] =
      await Promise.all([
        getPrisma().order.findMany({ where, select: { status: true } }),
        getPrisma().order.aggregate({
          where: {
            ...where,
            placedAt: { gte: today },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
          _count: { _all: true },
          _sum: { grandTotalAmount: true },
        }),
        getPrisma().order.count({
          where: {
            ...where,
            status: {
              in: [
                "PLACED",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "OUT_FOR_DELIVERY",
              ],
            },
          },
        }),
        getPrisma().branchInventory.findMany({
          where: {
            branch: {
              businessId: actor.businessId,
              ...(ids ? { id: { in: ids } } : {}),
            },
            reorderLevel: { not: null },
          },
          select: {
            quantityOnHand: true,
            quantityReserved: true,
            reorderLevel: true,
          },
        }),
        getPrisma().orderReview.aggregate({
          where: {
            order: {
              branch: {
                businessId: actor.businessId,
                ...(ids ? { id: { in: ids } } : {}),
              },
            },
          },
          _avg: { foodRating: true, riderRating: true },
          _count: { _all: true },
        }),
      ]);
    const counts: Record<string, number> = {};
    for (const x of statuses) counts[x.status] = (counts[x.status] ?? 0) + 1;
    const lowStock = inventory.filter((x) =>
      x.quantityOnHand.minus(x.quantityReserved).lte(x.reorderLevel!),
    ).length;
    return {
      today: {
        orders: todayTotals._count._all,
        revenue: todayTotals._sum.grandTotalAmount?.toString() ?? "0",
      },
      activeOrders,
      ordersByStatus: counts,
      lowStockItems: lowStock,
      reviews: {
        count: reviews._count._all,
        averageFoodRating: reviews._avg.foodRating,
        averageRiderRating: reviews._avg.riderRating,
      },
    };
  },
  async audit(actor: BusinessActor, limit: number) {
    if (actor.role !== "OWNER" && actor.role !== "ADMIN")
      throw new ForbiddenError(
        "Only owners and administrators can view audit logs.",
      );
    return (
      await getPrisma().auditLog.findMany({
        where: { businessId: actor.businessId },
        take: limit,
        orderBy: { createdAt: "desc" },
      })
    ).map((x) => ({
      ...x,
      id: x.id.toString(),
      createdAt: x.createdAt.toISOString(),
    }));
  },
  async reviews(actor: BusinessActor, limit: number) {
    const ids = await branchScope(actor);
    return getPrisma().orderReview.findMany({
      where: {
        order: {
          branch: {
            businessId: actor.businessId,
            ...(ids ? { id: { in: ids } } : {}),
          },
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { publicId: true, branchId: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
  },
};
