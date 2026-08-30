import { ZodError } from "zod";
import { describeDatabaseError } from "@/server/db/errors";
import { withRequestId } from "@/server/http/request-id";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} was not found.`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 409, details);
  }
}

function jsonError(
  status: number,
  requestId: string,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      error: { code, message, ...(details === undefined ? {} : { details }) },
      meta: { requestId },
    },
    { status, headers: withRequestId(undefined, requestId) },
  );
}

export function toHttpError(error: unknown, requestId: string): Response {
  if (error instanceof AppError) {
    return jsonError(
      error.status,
      requestId,
      error.code,
      error.message,
      error.details,
    );
  }

  if (error instanceof ZodError) {
    return jsonError(
      400,
      requestId,
      "VALIDATION_ERROR",
      "Request validation failed.",
      error.issues,
    );
  }

  const databaseError = describeDatabaseError(error);
  if (databaseError?.code === "P2002") {
    return jsonError(
      409,
      requestId,
      "UNIQUE_CONSTRAINT_VIOLATION",
      "The resource already exists.",
    );
  }
  if (databaseError?.code === "P2025") {
    return jsonError(
      404,
      requestId,
      "NOT_FOUND",
      "The requested resource was not found.",
    );
  }

  console.error(
    JSON.stringify({ level: "error", requestId, code: "INTERNAL_ERROR" }),
  );
  return jsonError(
    500,
    requestId,
    "INTERNAL_ERROR",
    "An unexpected error occurred.",
  );
}
