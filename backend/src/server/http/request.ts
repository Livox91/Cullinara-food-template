import { AppError } from "@/server/http/errors";

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json.",
      415,
    );
  }

  try {
    return await request.json();
  } catch {
    throw new AppError(
      "INVALID_JSON",
      "The request body is not valid JSON.",
      400,
    );
  }
}
