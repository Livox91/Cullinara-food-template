import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { id, menuActor } from "@/server/modules/menu/menu.route";
import { UpdateCategorySchema } from "@/server/modules/menu/menu.schemas";
import { menuService } from "@/server/modules/menu/menu.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; categoryId: string }> };
export async function PATCH(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params;
    const { actor } = await menuActor(r, p.businessId);
    return apiOk(
      await menuService.updateCategory(
        actor,
        id(p.categoryId),
        UpdateCategorySchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
    );
  });
}
