import { z } from "zod";
export const InitializePaymentSchema = z.object({
  method: z.enum(["CASH_ON_DELIVERY", "CARD", "WALLET", "BANK_TRANSFER"]),
});
export const RefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(1).max(500),
});
export const WebhookSchema = z.object({
  eventId: z.string().min(1).max(200),
  providerPaymentId: z.string().min(1).max(200),
  status: z.enum(["AUTHORIZED", "CAPTURED", "FAILED", "CANCELLED"]),
  failureCode: z.string().max(100).optional(),
  failureMessage: z.string().max(500).optional(),
});
