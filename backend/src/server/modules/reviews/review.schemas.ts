import { z } from "zod";
export const ReviewSchema = z
  .object({
    foodRating: z.number().int().min(1).max(5).nullish(),
    riderRating: z.number().int().min(1).max(5).nullish(),
    comment: z.string().trim().max(2000).nullish(),
  })
  .refine((v) => v.foodRating != null || v.riderRating != null || !!v.comment, {
    message: "Review cannot be empty",
  });
