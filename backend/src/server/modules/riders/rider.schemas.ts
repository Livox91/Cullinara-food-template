import { z } from "zod";
export const RiderStatusSchema = z.object({
  status: z.enum(["OFFLINE", "AVAILABLE"]),
});
export const VehicleSchema = z
  .object({
    vehicleType: z.string().trim().min(1).max(80).nullish(),
    vehiclePlate: z.string().trim().min(1).max(40).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0);
export const LocationSchema = z.object({
  deliveryId: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyM: z.coerce.number().min(0).nullish(),
  headingDeg: z.coerce.number().min(0).max(360).nullish(),
  speedMps: z.coerce.number().min(0).nullish(),
  recordedAt: z.coerce.date().default(() => new Date()),
});
export const EnrollRiderSchema = z.object({
  vehicleType: z.string().trim().min(1).max(80),
  vehiclePlate: z.string().trim().min(1).max(40),
});
