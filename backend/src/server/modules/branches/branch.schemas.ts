import { z } from "zod";
import { findOverlappingIntervalIndexes } from "@/server/modules/branches/branch-hours.policy";

const OptionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).optional().nullable();
const TimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Time must use 24-hour HH:mm format.");
const DecimalAmountSchema = z.union([
  z.number().nonnegative().finite(),
  z
    .string()
    .trim()
    .regex(
      /^\d+(?:\.\d{1,2})?$/,
      "Use a non-negative amount with at most two decimal places.",
    ),
]);

export const CreateBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((value) => value.toUpperCase()),
  phone: OptionalText(32),
  addressLine1: z.string().trim().min(3).max(180),
  addressLine2: OptionalText(180),
  city: z.string().trim().min(2).max(100),
  province: OptionalText(100),
  postalCode: OptionalText(24),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  minimumOrderAmount: DecimalAmountSchema.default(0),
  deliveryRadiusKm: DecimalAmountSchema.optional().nullable(),
  defaultPrepMinutes: z.number().int().min(1).max(240).default(20),
});

export const UpdateBranchSchema = CreateBranchSchema.partial()
  .extend({ isActive: z.boolean().optional() })
  .refine(
    (input) => Object.keys(input).length > 0,
    "At least one branch field is required.",
  );

export const SetOrderAcceptanceSchema = z.object({
  isAcceptingOrders: z.boolean(),
});

export const OperatingIntervalSchema = z
  .object({
    opensAt: TimeSchema,
    closesAt: TimeSchema,
  })
  .refine((interval) => interval.opensAt !== interval.closesAt, {
    message: "Opening and closing times cannot be identical.",
    path: ["closesAt"],
  });

export const WeeklyOperatingDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    intervals: z.array(OperatingIntervalSchema).max(4),
  })
  .superRefine((day, context) => {
    if (day.isClosed && day.intervals.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Closed days cannot contain operating intervals.",
      });
    }
    if (!day.isClosed && day.intervals.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Open days require at least one interval.",
      });
    }
    for (const intervalIndex of findOverlappingIntervalIndexes(day.intervals)) {
      context.addIssue({
        code: "custom",
        path: ["intervals", intervalIndex],
        message: "Operating intervals cannot overlap.",
      });
    }
  });

export const ReplaceWeeklyHoursSchema = z
  .object({
    days: z.array(WeeklyOperatingDaySchema).length(7),
  })
  .superRefine((input, context) => {
    const uniqueDays = new Set(input.days.map((day) => day.dayOfWeek));
    if (uniqueDays.size !== 7) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Provide exactly one schedule for every day of the week.",
      });
    }
  });

export const UpsertSpecialHoursSchema = z
  .object({
    date: z.string().date(),
    note: OptionalText(240),
    isClosed: z.boolean(),
    intervals: z.array(OperatingIntervalSchema).max(1),
  })
  .superRefine((day, context) => {
    if (day.isClosed && day.intervals.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Closed special dates cannot contain intervals.",
      });
    }
    if (!day.isClosed && day.intervals.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Open special dates require at least one interval.",
      });
    }
  });

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>;
export type SetOrderAcceptanceInput = z.infer<typeof SetOrderAcceptanceSchema>;
export type ReplaceWeeklyHoursInput = z.infer<typeof ReplaceWeeklyHoursSchema>;
export type UpsertSpecialHoursInput = z.infer<typeof UpsertSpecialHoursSchema>;
