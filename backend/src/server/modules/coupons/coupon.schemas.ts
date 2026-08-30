import { z } from "zod";

const money = z.coerce.number().min(0);
const CouponFields = z.object({
  branchId: z.string().uuid().nullish(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((value) => value.toUpperCase()),
  discountType: z.enum(["FIXED", "PERCENT"]),
  discountValue: money.positive(),
  maxDiscount: money.nullish(),
  minOrderAmount: money.default(0),
  totalUsageLimit: z.number().int().positive().nullish(),
  perCustomerLimit: z.number().int().positive().nullish(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  isActive: z.boolean().default(true),
});

export const CreateCouponSchema = CouponFields.refine(
  (value) => value.endsAt > value.startsAt,
  { message: "endsAt must be after startsAt" },
).refine(
  (value) => value.discountType !== "PERCENT" || value.discountValue <= 100,
  { message: "Percentage cannot exceed 100" },
);

export const UpdateCouponSchema = CouponFields.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .refine(
    (value) =>
      !value.startsAt || !value.endsAt || value.endsAt > value.startsAt,
    { message: "endsAt must be after startsAt" },
  )
  .refine(
    (value) =>
      value.discountType !== "PERCENT" ||
      value.discountValue === undefined ||
      value.discountValue <= 100,
    { message: "Percentage cannot exceed 100" },
  );
