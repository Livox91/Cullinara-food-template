import { apiHandler, apiOk } from "@/server/http/response";
import {
  inventoryActor,
  uuid,
} from "@/server/modules/inventory/inventory.route";
import { inventoryService } from "@/server/modules/inventory/inventory.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; branchId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params,
      b = uuid(p.branchId);
    return apiOk(
      await inventoryService.list(await inventoryActor(r, p.businessId, b), b),
      requestId,
    );
  });
}
