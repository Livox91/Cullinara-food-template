import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { VerifyIdentitySchema } from "@/server/modules/auth/auth.schemas";
import { authService } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const input = VerifyIdentitySchema.parse(await readJson(request));
    return apiOk(
      await authService.verifyIdentity(principal, "EMAIL", input, requestId),
      requestId,
    );
  });
}
