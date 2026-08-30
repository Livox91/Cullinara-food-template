import { getPrisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";
import { apiHandler, apiOk } from "@/server/http/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
    } catch {
      throw new AppError(
        "DEPENDENCY_UNAVAILABLE",
        "PostgreSQL is unavailable.",
        503,
      );
    }

    return apiOk(
      { status: "ready", dependencies: { postgres: "ok" } },
      requestId,
    );
  });
}
