import { apiHandler, apiOk } from "@/server/http/response";
import { readJson } from "@/server/http/request";
import { RefreshSchema } from "@/server/modules/auth/auth.schemas";
import { authService } from "@/server/modules/auth/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const input = RefreshSchema.parse(await readJson(request));
    return apiOk(await authService.refresh(input), requestId);
  });
}
