import { z } from "zod";
export const OrderReasonSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export const OrderListSchema = z.object({
  status: z
    .enum([
      "PLACED",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
