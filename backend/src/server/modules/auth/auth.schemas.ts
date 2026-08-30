import { z } from "zod";

const EmailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const PhoneSchema = z.string().trim().min(7).max(32);
const PasswordSchema = z.string().min(10).max(128);

export const RegisterCustomerSchema = z
  .object({
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    password: PasswordSchema,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
  })
  .refine((input) => Boolean(input.email || input.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

export const LoginSchema = z
  .object({
    email: EmailSchema.optional(),
    phone: PhoneSchema.optional(),
    password: PasswordSchema,
  })
  .refine((input) => Boolean(input.email || input.phone), {
    message: "Either email or phone is required.",
    path: ["email"],
  });

export const RefreshSchema = z.object({
  refreshToken: z.string().min(32).max(512),
});

export const RequestVerificationSchema = z.object({
  channel: z.enum(["EMAIL", "PHONE"]),
});

export const VerifyIdentitySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must contain exactly six digits."),
});

export type RegisterCustomerInput = z.infer<typeof RegisterCustomerSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type RequestVerificationInput = z.infer<
  typeof RequestVerificationSchema
>;
export type VerifyIdentityInput = z.infer<typeof VerifyIdentitySchema>;
