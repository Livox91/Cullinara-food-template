import { z } from "zod";

const money = z.coerce.number().min(0).max(99_999_999.99);
const imageReference = z
  .string()
  .trim()
  .max(512)
  .regex(/^\/[a-zA-Z0-9/_-]+\.webp$/);
const imageValue = z.union([z.string().url().max(2048), imageReference]);

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export const UpdateCategorySchema = CreateCategorySchema.partial().refine(
  (v) => Object.keys(v).length > 0,
);
export const CreateItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullish(),
  imageUrl: imageValue.nullish(),
  isActive: z.boolean().default(true),
  isCombo: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});
export const UpdateItemSchema = CreateItemSchema.extend({
  itemType: z.enum(["STANDARD", "DEAL", "COMBO"]).optional(),
}).partial().refine(
  (v) => Object.keys(v).length > 0,
);
export const CreateDealComboSchema = z.object({
  categoryId: z.string().uuid(),
  kind: z.enum(["DEAL", "COMBO"]),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).nullish(),
  imageUrl: imageValue.nullish(),
  sku: z.string().trim().min(1).max(80),
  price: money,
  prepMinutes: z.number().int().min(0).max(1440).nullish(),
  components: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
  })).min(2).max(50).refine((rows) => new Set(rows.map((row) => row.variantId)).size === rows.length, {
    message: "A menu variant can only appear once in a deal or combo.",
  }),
});
export const CreateVariantSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  basePrice: money,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  prepMinutes: z.number().int().min(0).max(1440).nullish(),
});
export const UpdateVariantSchema = CreateVariantSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
);
export const CreateModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export const CreateModifierOptionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceDelta: money.default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export const AttachModifierGroupSchema = z
  .object({
    isRequired: z.boolean().default(false),
    minSelections: z.number().int().min(0).default(0),
    maxSelections: z.number().int().min(1).max(100).default(1),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine((v) => v.minSelections <= v.maxSelections, {
    message: "minSelections cannot exceed maxSelections",
  });
export const ConfigureBranchVariantSchema = z.object({
  priceOverride: money.nullish(),
  isAvailable: z.boolean().default(true),
  soldOutUntil: z.coerce.date().nullish(),
});
export const ConfigureBranchModifierSchema = z.object({
  priceOverride: money.nullish(),
  isAvailable: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateItemInput = z.infer<typeof CreateItemSchema>;
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
export type CreateDealComboInput = z.infer<typeof CreateDealComboSchema>;
export type CreateVariantInput = z.infer<typeof CreateVariantSchema>;
export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>;
export type CreateModifierGroupInput = z.infer<
  typeof CreateModifierGroupSchema
>;
export type CreateModifierOptionInput = z.infer<
  typeof CreateModifierOptionSchema
>;
export type AttachModifierGroupInput = z.infer<
  typeof AttachModifierGroupSchema
>;
export type ConfigureBranchVariantInput = z.infer<
  typeof ConfigureBranchVariantSchema
>;
export type ConfigureBranchModifierInput = z.infer<
  typeof ConfigureBranchModifierSchema
>;
