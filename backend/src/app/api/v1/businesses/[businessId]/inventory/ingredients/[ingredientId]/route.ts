import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateIngredientSchema } from "@/server/modules/inventory/inventory.schemas";
import {
  inventoryActor,
  uuid,
} from "@/server/modules/inventory/inventory.route";
import { inventoryService } from "@/server/modules/inventory/inventory.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; ingredientId: string }> };
export async function PATCH(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params;
    return apiOk(
      await inventoryService.updateIngredient(
        await inventoryActor(r, p.businessId),
        uuid(p.ingredientId),
        UpdateIngredientSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
    );
  });
}
