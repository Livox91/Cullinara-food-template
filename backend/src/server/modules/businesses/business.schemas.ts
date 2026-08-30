import { z } from "zod";

const SlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const CreateBusinessSchema = z.object({
  legalName: z.string().trim().min(2).max(180),
  displayName: z.string().trim().min(2).max(120),
  slug: SlugSchema,
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .default("PKR"),
  timezone: z.string().trim().min(3).max(64).default("Asia/Karachi"),
  taxRegistrationNo: z.string().trim().max(80).optional(),
});

export const UpdateBusinessSchema = z
  .object({
    legalName: z.string().trim().min(2).max(180).optional(),
    displayName: z.string().trim().min(2).max(120).optional(),
    slug: SlugSchema.optional(),
    defaultCurrency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    timezone: z.string().trim().min(3).max(64).optional(),
    taxRegistrationNo: z.string().trim().max(80).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

export const InviteMemberSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase())
      .optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "SUPPORT"]),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

export const ChangeMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "CASHIER", "KITCHEN", "SUPPORT"]),
});

export const SetMemberBranchAccessSchema = z.object({
  branchIds: z
    .array(z.string().uuid())
    .max(250)
    .transform((ids) => [...new Set(ids)]),
});

export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof ChangeMemberRoleSchema>;
export type SetMemberBranchAccessInput = z.infer<
  typeof SetMemberBranchAccessSchema
>;
