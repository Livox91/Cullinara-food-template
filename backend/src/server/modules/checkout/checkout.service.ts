import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { AppError, ConflictError, NotFoundError } from "@/server/http/errors";
import { cartGraph } from "@/server/modules/carts/cart.repository";
import { validateCoupon } from "@/server/modules/coupons/coupon.service";
import type { CheckoutInput } from "@/server/modules/checkout/checkout.schemas";
import { orderDto, orderInclude } from "@/server/modules/orders/order.mapper";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";
import { priceCart } from "@/server/modules/pricing/pricing.service";
import { toBranchDto } from "@/server/modules/branches/branch.mapper";
const D = (v: any) => new Prisma.Decimal(v);
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
function distanceKm(aLat: any, aLng: any, bLat: any, bLng: any) {
  const r = 6371,
    toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(Number(bLat) - Number(aLat)),
    dLng = toRad(Number(bLng) - Number(aLng));
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(aLat))) *
      Math.cos(toRad(Number(bLat))) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}
export const checkoutService = {
  async checkout(userId: string, key: string, input: CheckoutInput) {
    const scope = `checkout:${userId}`,
      requestHash = hash(input);
    return withTransaction({ actorType: "CUSTOMER", userId }, async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${scope + ":" + key}))::text`;
      const previous = await tx.idempotencyKey.findUnique({
        where: { scope_key: { scope, key } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw new ConflictError(
            "IDEMPOTENCY_KEY_REUSED",
            "The idempotency key was already used with a different request.",
          );
        if (previous.responseBody) return previous.responseBody;
        throw new ConflictError(
          "REQUEST_IN_PROGRESS",
          "A request with this idempotency key is in progress.",
        );
      }
      await tx.idempotencyKey.create({
        data: {
          userId,
          scope,
          key,
          requestHash,
          expiresAt: new Date(Date.now() + 24 * 3600000),
        },
      });
      const customer = await tx.customerProfile.findUnique({
        where: { userId },
        include: { user: true },
      });
      if (!customer) throw new NotFoundError("Customer profile");
      if (!customer.user.emailVerifiedAt && !customer.user.phoneVerifiedAt)
        throw new AppError(
          "IDENTITY_NOT_VERIFIED",
          "Verify an email address or phone number before checkout.",
          403,
        );
      const cart = await tx.cart.findFirst({
        where: { id: input.cartId, customerId: customer.id, status: "ACTIVE" },
        include: cartGraph,
      });
      if (!cart) throw new NotFoundError("Active cart");
      if (cart.items.length === 0)
        throw new AppError("EMPTY_CART", "The cart is empty.", 422);
      if (
        !cart.branch.isActive ||
        !cart.branch.isAcceptingOrders ||
        cart.branch.business.status !== "ACTIVE"
      )
        throw new AppError(
          "BRANCH_UNAVAILABLE",
          "The branch is not accepting orders.",
          422,
        );
      if (input.scheduledFor && input.scheduledFor <= new Date())
        throw new AppError(
          "INVALID_SCHEDULE",
          "scheduledFor must be in the future.",
          422,
        );
      if (!toBranchDto(cart.branch, input.scheduledFor ?? new Date()).isOpenNow)
        throw new AppError(
          "BRANCH_CLOSED",
          "The branch is closed at the requested time.",
          422,
        );
      if (cart.fulfillmentType === "DELIVERY") {
        if (!cart.address)
          throw new AppError(
            "DELIVERY_ADDRESS_REQUIRED",
            "Select a delivery address.",
            422,
          );
        if (cart.branch.deliveryRadiusKm !== null) {
          const km = distanceKm(
            cart.branch.latitude,
            cart.branch.longitude,
            cart.address.latitude,
            cart.address.longitude,
          );
          if (D(km).gt(cart.branch.deliveryRadiusKm))
            throw new AppError(
              "OUTSIDE_DELIVERY_AREA",
              "The address is outside this branch's delivery radius.",
              422,
            );
        }
      }
      const coupon = await validateCoupon(
        customer.id,
        cart,
        input.couponCode,
        tx as any,
        true,
      );
      const quote = await priceCart(cart, coupon);
      if (D(quote.subtotal).lt(cart.branch.minimumOrderAmount))
        throw new AppError(
          "MINIMUM_ORDER_NOT_MET",
          "The cart is below the branch minimum order.",
          422,
          { minimum: cart.branch.minimumOrderAmount.toString() },
        );
      const customerName =
        [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
        cart.address?.recipientName ||
        "Customer";
      const customerPhone = input.contactPhone || cart.address?.phone || customer.user.phone;
      if (!customerPhone)
        throw new AppError(
          "CUSTOMER_PHONE_REQUIRED",
          "A customer phone number is required.",
          422,
        );
      const itemData = cart.items.map((line: any) => {
        const q = quote.lines.find((x: any) => x.cartItemId === line.id);
        return {
          variantId: line.variantId,
          itemNameSnapshot: line.variant.menuItem.name,
          variantNameSnapshot: line.variant.name,
          skuSnapshot: line.variant.sku,
          quantity: line.quantity,
          unitPrice: q.unitPrice,
          baseSubtotal: D(q.unitPrice).mul(line.quantity),
          modifierSubtotal: D(q.modifierUnit).mul(line.quantity),
          totalAmount: q.total,
          specialInstructions: line.specialInstructions,
          componentSnapshot: line.variant.menuItem.comboComponents?.map((component: any) => ({
            variantId: component.variantId,
            quantity: component.quantity,
            itemName: component.variant.menuItem.name,
            variantName: component.variant.name,
          })) ?? undefined,
          modifiers: {
            create: line.modifiers.map((m: any) => {
              const qm = q.modifiers.find((x: any) => x.id === m.optionId);
              return {
                modifierOptionId: m.optionId,
                groupNameSnapshot: m.option.modifierGroup.name,
                optionNameSnapshot: m.option.name,
                quantity: m.quantity,
                unitPriceDelta: qm.unitPriceDelta,
                totalPrice: D(qm.total).mul(line.quantity),
              };
            }),
          },
        };
      });
      const adjustmentData = [
        quote.discount !== "0" && {
          type: "DISCOUNT" as const,
          amount: D(quote.discount).negated(),
          description: coupon ? `Coupon ${coupon.code}` : "Discount",
          sourceType: coupon ? "Coupon" : undefined,
          sourceId: coupon?.id,
        },
        quote.tax !== "0" && {
          type: "TAX" as const,
          amount: quote.tax,
          description: "Tax",
        },
        quote.deliveryFee !== "0" && {
          type: "DELIVERY_FEE" as const,
          amount: quote.deliveryFee,
          description: "Delivery fee",
        },
        quote.serviceFee !== "0" && {
          type: "SERVICE_FEE" as const,
          amount: quote.serviceFee,
          description: "Service fee",
        },
        quote.rounding !== "0" && {
          type: "ROUNDING" as const,
          amount: quote.rounding,
          description: "Rounding",
        },
      ].filter(Boolean) as any;
      const deliveryData =
        cart.fulfillmentType === "DELIVERY" && cart.address
          ? {
              delivery: {
                create: {
                  recipientName: cart.address.recipientName,
                  recipientPhone: cart.address.phone,
                  addressLine1: cart.address.addressLine1,
                  addressLine2: cart.address.addressLine2,
                  city: cart.address.city,
                  province: cart.address.province,
                  postalCode: cart.address.postalCode,
                  latitude: cart.address.latitude,
                  longitude: cart.address.longitude,
                  deliveryNote: cart.address.deliveryNote,
                  distanceKm: distanceKm(
                    cart.branch.latitude,
                    cart.branch.longitude,
                    cart.address.latitude,
                    cart.address.longitude,
                  ),
                },
              },
            }
          : {};
      const order = await tx.order.create({
        data: {
          branchId: cart.branchId,
          customerId: customer.id,
          cartId: cart.id,
          fulfillmentType: cart.fulfillmentType,
          currency: quote.currency,
          customerName,
          customerPhone,
          customerNote: input.customerNote,
          scheduledFor: input.scheduledFor,
          subtotalAmount: quote.subtotal,
          discountAmount: quote.discount,
          taxAmount: quote.tax,
          deliveryFeeAmount: quote.deliveryFee,
          serviceFeeAmount: quote.serviceFee,
          roundingAmount: quote.rounding,
          grandTotalAmount: quote.grandTotal,
          couponCodeSnapshot: coupon?.code,
          items: { create: itemData },
          adjustments: { create: adjustmentData },
          payments: {
            create: {
              method: input.paymentMethod,
              status: "PENDING",
              amount: quote.grandTotal,
              currency: quote.currency,
            },
          },
          ...deliveryData,
        },
        include: orderInclude,
      });
      if (coupon)
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            customerId: customer.id,
            discountAmount: quote.discount,
          },
        });
      const requirements = new Map<string, Prisma.Decimal>();
      for (const line of cart.items) {
        const comboComponents = await tx.comboComponent.findMany({ where: { comboItemId: line.variant.menuItemId } });
        const recipeTargets = comboComponents.length
          ? comboComponents.map((component: any) => ({ variantId: component.variantId, quantity: component.quantity * line.quantity }))
          : [{ variantId: line.variantId, quantity: line.quantity }];
        for (const target of recipeTargets) {
          const recipe = await tx.recipeComponent.findMany({ where: { variantId: target.variantId } });
          for (const component of recipe)
            requirements.set(
              component.ingredientId,
              (requirements.get(component.ingredientId) ?? D(0)).plus(D(component.quantity).mul(target.quantity)),
            );
        }
      }
      for (const [ingredientId, quantity] of requirements)
        await tx.inventoryMovement.create({
          data: {
            branchId: cart.branchId,
            ingredientId,
            orderId: order.id,
            reason: "ORDER_RESERVATION",
            deltaReserved: quantity,
            reference: `Order ${order.publicId} reservation`,
          },
        });
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: "CONVERTED" },
      });
      await outboxRepository.write(tx, {
        aggregateType: "Order",
        aggregateId: order.id,
        eventType: "OrderPlaced",
        payload: {
          orderId: order.id,
          publicId: order.publicId,
          branchId: order.branchId,
        },
      });
      const response = orderDto(order);
      await tx.idempotencyKey.update({
        where: { scope_key: { scope, key } },
        data: {
          responseStatus: 201,
          responseBody: JSON.parse(JSON.stringify(response)),
        },
      });
      return response;
    });
  },
};
