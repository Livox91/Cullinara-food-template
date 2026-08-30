import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { riderService } from "@/server/modules/riders/rider.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(await riderService.me((await requirePrincipal(r)).userId), requestId),
  );
}
