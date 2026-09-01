import { z } from "zod";

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const CreateImageUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.literal("image/webp"),
  fileSize: z.number().int().positive().max(MAX_IMAGE_UPLOAD_BYTES),
});

export type CreateImageUploadInput = z.infer<typeof CreateImageUploadSchema>;
