import { getEnvironment } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import { apiHandler, apiOk } from "@/server/http/response";
import { maintenanceService } from "@/server/modules/workers/maintenance.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const expected = getEnvironment().WORKER_SECRET;
    if (!expected || r.headers.get("x-worker-secret") !== expected)
      throw new AppError(
        "UNAUTHORIZED_WORKER",
        "Worker credentials are invalid.",
        401,
      );
    return apiOk(await maintenanceService.run(), requestId);
  });
}
