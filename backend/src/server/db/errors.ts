import type { Prisma } from "../../../generated/prisma/client";

export interface DatabaseErrorDetails {
  code: string;
  constraint?: string;
}

export function describeDatabaseError(
  error: unknown,
): DatabaseErrorDetails | null {
  const candidate = error as
    Partial<Prisma.PrismaClientKnownRequestError> | undefined;
  if (!candidate || typeof candidate.code !== "string") return null;

  const meta = candidate.meta as
    { constraint?: string; target?: string[] } | undefined;
  return {
    code: candidate.code,
    constraint: meta?.constraint ?? meta?.target?.join(","),
  };
}
