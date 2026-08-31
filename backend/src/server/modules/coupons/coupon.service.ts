import "server-only";
import { Prisma } from "../../../../generated/prisma/client";
import type { BusinessActor } from "@/server/auth/authorization";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { AppError, NotFoundError } from "@/server/http/errors";
import type { z } from "zod";
import type {
  CreateCouponSchema,
  UpdateCouponSchema,
} from "@/server/modules/coupons/coupon.schemas";
import { auditRepository } from "@/server/modules/audit/audit.repository";
const D = (v: any) => new Prisma.Decimal(v);
export async function validateCoupon(
  customerId: string,
  cart: any,
  code?: string,
  client: any = getPrisma(),
  lock = false,
) {
  if (!code) return null;
  let coupon = await client.coupon.findUnique({
    where: {
      businessId_code: {
        businessId: cart.branch.businessId,
        code: code.toUpperCase(),
      },
    },
  });
  if (coupon && lock) {
    await client.$queryRaw`SELECT "id" FROM "Coupon" WHERE "id" = ${coupon.id}::uuid FOR UPDATE`;
    coupon = await client.coupon.findUnique({ where: { id: coupon.id } });
  }
  const now = new Date();
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.startsAt > now ||
    coupon.endsAt < now ||
    (coupon.branchId && coupon.branchId !== cart.branchId)
  )
    throw new AppError(
      "COUPON_INVALID",
      "The coupon is invalid or expired.",
      422,
    );
  const subtotal = (await import("@/server/modules/pricing/pricing.service"))
    .priceCart;
  const base = await subtotal(cart);
  if (D(base.subtotal).lt(coupon.minOrderAmount))
    throw new AppError(
      "COUPON_MINIMUM_NOT_MET",
      "The cart does not meet the coupon minimum.",
      422,
    );
  if (
    coupon.totalUsageLimit !== null &&
    (await client.couponRedemption.count({ where: { couponId: coupon.id } })) >=
      coupon.totalUsageLimit
  )
    throw new AppError(
      "COUPON_LIMIT_REACHED",
      "The coupon usage limit has been reached.",
      422,
    );
  if (
    coupon.perCustomerLimit !== null &&
    (await client.couponRedemption.count({
      where: { couponId: coupon.id, customerId },
    })) >= coupon.perCustomerLimit
  )
    throw new AppError(
      "COUPON_CUSTOMER_LIMIT_REACHED",
      "You have already used this coupon the maximum number of times.",
      422,
    );
  return coupon;
}
const dto = (c: any) => ({
  ...c,
  discountValue: c.discountValue.toString(),
  maxDiscount: c.maxDiscount?.toString() ?? null,
  minOrderAmount: c.minOrderAmount.toString(),
});
export const couponAdminService = {
  async list(actor: BusinessActor) {
    return (
      await getPrisma().coupon.findMany({
        where: { businessId: actor.businessId },
        orderBy: { createdAt: "desc" },
      })
    ).map(dto);
  },
  async create(
    actor: BusinessActor,
    input: z.infer<typeof CreateCouponSchema>,
    requestId: string,
  ) {
    if (
      input.branchId &&
      !(await getPrisma().branch.findFirst({
        where: { id: input.branchId, businessId: actor.businessId },
      }))
    )
      throw new NotFoundError("Branch");
    return dto(
      await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          const row = await tx.coupon.create({
            data: { businessId: actor.businessId, ...input },
          });
          await auditRepository.write(tx, {
            businessId: actor.businessId,
            actorUserId: actor.userId,
            actorType: "BUSINESS",
            action: "coupon.create",
            entityType: "Coupon",
            entityId: row.id,
            after: dto(row),
            requestId,
          });
          return row;
        },
      ),
    );
  },
  async update(
    actor: BusinessActor,
    id: string,
    input: z.infer<typeof UpdateCouponSchema>,
    requestId: string,
  ) {
    if (
      !(await getPrisma().coupon.findFirst({
        where: { id, businessId: actor.businessId },
      }))
    )
      throw new NotFoundError("Coupon");
    return dto(
      await withTransaction(
        { actorType: "BUSINESS", userId: actor.userId },
        async (tx) => {
          const row = await tx.coupon.update({ where: { id }, data: input });
          await auditRepository.write(tx, {
            businessId: actor.businessId,
            actorUserId: actor.userId,
            actorType: "BUSINESS",
            action: "coupon.update",
            entityType: "Coupon",
            entityId: id,
            after: dto(row),
            requestId,
          });
          return row;
        },
      ),
    );
  },
  async disable(actor: BusinessActor, id: string, requestId: string) {
    return this.update(actor, id, { isActive: false }, requestId);
  },
  async delete(actor: BusinessActor, id: string, requestId: string) {
    const coupon = await getPrisma().coupon.findFirst({ where: { id, businessId: actor.businessId } });
    if (!coupon) throw new NotFoundError("Coupon");
    const redemptions = await getPrisma().couponRedemption.count({ where: { couponId: id } });
    if (redemptions > 0)
      throw new AppError("COUPON_HAS_REDEMPTIONS", "A redeemed coupon cannot be deleted; disable it instead.", 409);
    return withTransaction({ actorType: "BUSINESS", userId: actor.userId }, async (tx) => {
      await tx.coupon.delete({ where: { id } });
      await auditRepository.write(tx, { businessId: actor.businessId, actorUserId: actor.userId, actorType: "BUSINESS", action: "coupon.delete", entityType: "Coupon", entityId: id, before: dto(coupon), requestId });
      return { id, deleted: true };
    });
  },
};
