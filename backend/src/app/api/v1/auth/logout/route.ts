import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { authService } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    await authService.logout(principal.userId, principal.sessionId);
    return apiOk({ loggedOut: true }, requestId);
  });
}
