import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { RequestVerificationSchema } from "@/server/modules/auth/auth.schemas";
import { authService } from "@/server/modules/auth/auth.service";
import { maintenanceService } from "@/server/modules/workers/maintenance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const input = RequestVerificationSchema.parse(await readJson(request));
    const verification = await authService.requestVerification(
      principal,
      input,
      requestId,
    );
    const delivery = await maintenanceService.publishOutbox([
      "IdentityVerificationRequested",
    ], principal.userId);
    return apiOk(
      {
        ...verification,
        delivery:
          delivery.published > 0 && delivery.failed === 0 ? "SENT" : "QUEUED",
      },
      requestId,
      { status: 202 },
    );
  });
}
