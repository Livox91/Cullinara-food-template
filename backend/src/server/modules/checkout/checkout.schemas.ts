import { z } from "zod";
export const CheckoutSchema = z.object({
  cartId: z.string().uuid(),
  couponCode: z.string().trim().min(1).max(64).optional(),
  paymentMethod: z.enum([
    "CASH_ON_DELIVERY",
    "CARD",
    "WALLET",
    "BANK_TRANSFER",
  ]),
  scheduledFor: z.coerce.date().nullable().default(null),
  customerNote: z.string().trim().max(1000).nullish(),
  contactPhone: z.string().trim().min(7).max(32).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
