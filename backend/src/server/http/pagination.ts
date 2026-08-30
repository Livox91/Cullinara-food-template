import { z } from "zod";

const PaginationSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export function parsePagination(
  searchParams: URLSearchParams,
): PaginationInput {
  return PaginationSchema.parse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}
