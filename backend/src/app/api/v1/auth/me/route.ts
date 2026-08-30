import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { authService } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    return apiOk(await authService.getCurrentUser(principal), requestId);
  });
}
