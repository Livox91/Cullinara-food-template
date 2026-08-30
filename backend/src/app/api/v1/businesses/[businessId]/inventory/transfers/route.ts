import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { TransferSchema } from "@/server/modules/inventory/inventory.schemas";
import { inventoryActor } from "@/server/modules/inventory/inventory.route";
import { inventoryService } from "@/server/modules/inventory/inventory.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await inventoryService.transfer(
        await inventoryActor(r, (await c.params).businessId),
        TransferSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
      { status: 201 },
    ),
  );
}
