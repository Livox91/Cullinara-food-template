import { z } from "zod";
export const CartQuerySchema = z.object({
  branchId: z.string().uuid(),
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
});
export const AddCartItemSchema = z.object({
  cartId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  specialInstructions: z.string().trim().max(500).nullish(),
  modifiers: z
    .array(
      z.object({
        optionId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99).default(1),
      }),
    )
    .max(50)
    .default([]),
});
export const UpdateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(99).optional(),
    specialInstructions: z.string().trim().max(500).nullish(),
    modifiers: z
      .array(
        z.object({
          optionId: z.string().uuid(),
          quantity: z.number().int().min(1).max(99).default(1),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0);
export const CartIdSchema = z.object({ cartId: z.string().uuid() });
export const FulfillmentSchema = CartIdSchema.extend({
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
});
export const AddressSelectionSchema = CartIdSchema.extend({
  addressId: z.string().uuid().nullable(),
});
export const QuoteSchema = CartIdSchema.extend({
  couponCode: z.string().trim().min(1).max(64).optional(),
});
export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
