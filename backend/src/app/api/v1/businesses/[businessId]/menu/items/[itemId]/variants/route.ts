import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { id, menuActor } from "@/server/modules/menu/menu.route";
import { CreateVariantSchema } from "@/server/modules/menu/menu.schemas";
import { menuService } from "@/server/modules/menu/menu.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; itemId: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params;
    const { actor } = await menuActor(r, p.businessId);
    return apiOk(
      await menuService.createVariant(
        actor,
        id(p.itemId),
        CreateVariantSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
      { status: 201 },
    );
  });
}
