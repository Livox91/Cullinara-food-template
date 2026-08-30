import { z } from "zod";
const qty = z.coerce.number();
export const IngredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(30),
  isActive: z.boolean().default(true),
});
export const UpdateIngredientSchema = IngredientSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
);
export const RecipeSchema = z.object({
  components: z
    .array(
      z.object({ ingredientId: z.string().uuid(), quantity: qty.positive() }),
    )
    .max(100),
});
export const MovementSchema = z.object({
  ingredientId: z.string().uuid(),
  quantity: qty.positive(),
  reference: z.string().trim().max(200).nullish(),
});
export const AdjustmentSchema = z.object({
  ingredientId: z.string().uuid(),
  deltaOnHand: qty.refine((v) => v !== 0),
  reference: z.string().trim().min(1).max(200),
});
export const TransferSchema = z
  .object({
    fromBranchId: z.string().uuid(),
    toBranchId: z.string().uuid(),
    ingredientId: z.string().uuid(),
    quantity: qty.positive(),
    reference: z.string().trim().max(200).nullish(),
  })
  .refine((v) => v.fromBranchId !== v.toBranchId);
