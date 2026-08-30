import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client";
import type { BusinessActor } from "@/server/auth/authorization";
import { getEnvironment } from "@/server/config/env";
import { getPrisma } from "@/server/db/prisma";
import { withTransaction } from "@/server/db/transaction";
import { AppError, NotFoundError } from "@/server/http/errors";
import { outboxRepository } from "@/server/modules/outbox/outbox.repository";
const paymentDto = (p: any) => ({
  id: p.id,
  orderPublicId: p.order?.publicId,
  method: p.method,
  provider: p.provider,
  providerPaymentId: p.providerPaymentId,
  status: p.status,
  amount: p.amount.toString(),
  currency: p.currency,
  failureCode: p.failureCode,
  failureMessage: p.failureMessage,
  createdAt: p.createdAt.toISOString(),
  refunds:
    p.refunds?.map((r: any) => ({ ...r, amount: r.amount.toString() })) ?? [],
});
async function customer(userId: string, publicId: string) {
  const p = await getPrisma().customerProfile.findUnique({ where: { userId } });
  if (!p) throw new NotFoundError("Customer profile");
  const o = await getPrisma().order.findFirst({
    where: { publicId, customerId: p.id },
  });
  if (!o) throw new NotFoundError("Order");
  return o;
}
export const paymentService = {
  async listCustomer(userId: string, publicId: string) {
    const o = await customer(userId, publicId);
    return (
      await getPrisma().payment.findMany({
        where: { orderId: o.id },
        include: { order: true, refunds: true },
        orderBy: { createdAt: "desc" },
      })
    ).map(paymentDto);
  },
  async initialize(userId: string, publicId: string, method: any) {
    const o = await customer(userId, publicId);
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(o.status))
      throw new AppError(
        "ORDER_NOT_PAYABLE",
        "This order cannot accept a new payment.",
        409,
      );
    let existing = await getPrisma().payment.findFirst({
      where: {
        orderId: o.id,
        method,
        status: { in: ["PENDING", "AUTHORIZED", "CAPTURED"] },
      },
      include: { order: true, refunds: true },
    });
    const provider =
      method === "CARD"
        ? "card"
        : method === "WALLET"
          ? "wallet"
          : method === "BANK_TRANSFER"
            ? "bank"
            : null;
    if (existing) {
      if (provider && !existing.providerPaymentId)
        existing = await getPrisma().payment.update({
          where: { id: existing.id },
          data: { provider, providerPaymentId: randomUUID() },
          include: { order: true, refunds: true },
        });
      return {
        payment: paymentDto(existing),
        providerSession: existing.providerPaymentId
          ? {
              provider: existing.provider,
              reference: existing.providerPaymentId,
            }
          : null,
      };
    }
    const providerPaymentId = provider ? randomUUID() : null,
      p = await getPrisma().payment.create({
        data: {
          orderId: o.id,
          method,
          amount: o.grandTotalAmount,
          currency: o.currency,
          provider,
          providerPaymentId,
        },
        include: { order: true, refunds: true },
      });
    return {
      payment: paymentDto(p),
      providerSession: provider
        ? { provider, reference: providerPaymentId }
        : null,
    };
  },
  async listBusiness(actor: BusinessActor, publicId: string) {
    const o = await getPrisma().order.findFirst({
      where: { publicId, branch: { businessId: actor.businessId } },
    });
    if (!o) throw new NotFoundError("Order");
    return (
      await getPrisma().payment.findMany({
        where: { orderId: o.id },
        include: { order: true, refunds: true },
        orderBy: { createdAt: "desc" },
      })
    ).map(paymentDto);
  },
  async acceptCash(actor: BusinessActor, publicId: string, paymentId: string) {
    const payment = await getPrisma().payment.findFirst({
      where: {
        id: paymentId,
        order: { publicId, branch: { businessId: actor.businessId } },
      },
      include: { order: true },
    });
    if (!payment) throw new NotFoundError("Payment");
    if (payment.method !== "CASH_ON_DELIVERY")
      throw new AppError(
        "PAYMENT_METHOD_NOT_CASH",
        "Only cash payments can be accepted manually.",
        409,
      );
    if (!['PENDING', 'AUTHORIZED'].includes(payment.status))
      throw new AppError(
        "PAYMENT_ALREADY_PROCESSED",
        "This payment has already been processed.",
        409,
      );

    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        const capturedAt = new Date();
        const result = await tx.payment.updateMany({
          where: {
            id: payment.id,
            method: "CASH_ON_DELIVERY",
            status: { in: ["PENDING", "AUTHORIZED"] },
          },
          data: { status: "CAPTURED", capturedAt },
        });
        if (result.count !== 1)
          throw new AppError(
            "PAYMENT_ALREADY_PROCESSED",
            "This payment has already been processed.",
            409,
          );
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: "CAPTURED" },
        });
        await outboxRepository.write(tx, {
          aggregateType: "Payment",
          aggregateId: payment.id,
          eventType: "PaymentStatusChanged",
          payload: { paymentId: payment.id, status: "CAPTURED", source: "business_cash_acceptance" },
        });
        return {
          id: payment.id,
          orderPublicId: payment.order.publicId,
          method: payment.method,
          status: "CAPTURED" as const,
          amount: payment.amount.toString(),
          currency: payment.currency,
          capturedAt: capturedAt.toISOString(),
        };
      },
    );
  },
  async refund(
    actor: BusinessActor,
    publicId: string,
    input: { paymentId: string; amount: number; reason: string },
  ) {
    const payment = await getPrisma().payment.findFirst({
      where: {
        id: input.paymentId,
        order: { publicId, branch: { businessId: actor.businessId } },
      },
      include: { refunds: { where: { status: "SUCCEEDED" } }, order: true },
    });
    if (!payment) throw new NotFoundError("Payment");
    if (
      payment.status !== "CAPTURED" &&
      payment.status !== "PARTIALLY_REFUNDED"
    )
      throw new AppError(
        "PAYMENT_NOT_REFUNDABLE",
        "Only captured payments can be refunded.",
        409,
      );
    const refunded = payment.refunds.reduce(
        (n, r) => n.plus(r.amount),
        new Prisma.Decimal(0),
      ),
      amount = new Prisma.Decimal(input.amount);
    if (refunded.plus(amount).gt(payment.amount))
      throw new AppError(
        "REFUND_EXCEEDS_CAPTURE",
        "Refund exceeds the captured amount.",
        422,
      );
    return withTransaction(
      { actorType: "BUSINESS", userId: actor.userId },
      async (tx) => {
        const immediate = payment.method === "CASH_ON_DELIVERY",
          row = await tx.refund.create({
            data: {
              paymentId: payment.id,
              amount,
              status: immediate ? "SUCCEEDED" : "PENDING",
              reason: input.reason,
            },
          });
        if (immediate) {
          const total = refunded.plus(amount),
            status = total.eq(payment.amount)
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED";
          await tx.payment.update({
            where: { id: payment.id },
            data: { status },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: status },
          });
        }
        await outboxRepository.write(tx, {
          aggregateType: "Payment",
          aggregateId: payment.id,
          eventType: immediate ? "PaymentRefunded" : "RefundRequested",
          payload: {
            paymentId: payment.id,
            refundId: row.id,
            amount: amount.toString(),
          },
        });
        return { ...row, amount: row.amount.toString() };
      },
    );
  },
  async webhook(provider: string, secret: string | null, input: any) {
    const expected = getEnvironment().PAYMENT_WEBHOOK_SECRET;
    if (!expected)
      throw new AppError(
        "PAYMENT_WEBHOOK_NOT_CONFIGURED",
        "Payment webhook verification is not configured.",
        503,
      );
    const a = Buffer.from(secret ?? ""),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new AppError(
        "INVALID_WEBHOOK_SIGNATURE",
        "Webhook signature is invalid.",
        401,
      );
    return withTransaction({ actorType: "SYSTEM" }, async (tx) => {
      const scope = `payment-webhook:${provider}`;
      const prior = await tx.idempotencyKey.findUnique({
        where: { scope_key: { scope, key: input.eventId } },
      });
      if (prior) return prior.responseBody;
      const payment = await tx.payment.findFirst({
        where: { provider, providerPaymentId: input.providerPaymentId },
      });
      if (!payment) throw new NotFoundError("Payment");
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: input.status,
          failureCode: input.failureCode,
          failureMessage: input.failureMessage,
          authorizedAt: input.status === "AUTHORIZED" ? new Date() : undefined,
          capturedAt: input.status === "CAPTURED" ? new Date() : undefined,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: input.status },
      });
      const response = { received: true, paymentId: payment.id };
      await tx.idempotencyKey.create({
        data: {
          scope,
          key: input.eventId,
          requestHash: input.eventId,
          responseStatus: 200,
          responseBody: response,
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      });
      await outboxRepository.write(tx, {
        aggregateType: "Payment",
        aggregateId: payment.id,
        eventType: "PaymentStatusChanged",
        payload: { paymentId: payment.id, status: updated.status },
      });
      return response;
    });
  },
};
