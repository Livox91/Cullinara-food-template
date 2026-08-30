import { apiHandler, apiOk } from "@/server/http/response";
import { menuActor } from "@/server/modules/menu/menu.route";
import { menuService } from "@/server/modules/menu/menu.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string }> };
export async function GET(request: Request, c: C) {
  return apiHandler(request, async ({ requestId }) => {
    const { actor } = await menuActor(request, (await c.params).businessId);
    return apiOk(await menuService.listAdmin(actor), requestId);
  });
}
