import { z } from "zod";
const coordinate = z.coerce.number();
export const UpdateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).nullish(),
    lastName: z.string().trim().min(1).max(80).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0);
export const AddressSchema = z.object({
  label: z.string().trim().max(60).nullish(),
  recipientName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(7).max(32),
  addressLine1: z.string().trim().min(1).max(250),
  addressLine2: z.string().trim().max(250).nullish(),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().max(100).nullish(),
  postalCode: z.string().trim().max(20).nullish(),
  latitude: coordinate.min(-90).max(90),
  longitude: coordinate.min(-180).max(180),
  deliveryNote: z.string().trim().max(500).nullish(),
  isDefault: z.boolean().default(false),
});
export const UpdateAddressSchema = AddressSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
);
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>;
