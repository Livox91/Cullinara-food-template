import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { menuActor } from "@/server/modules/menu/menu.route";
import { CreateDealComboSchema } from "@/server/modules/menu/menu.schemas";
import { menuService } from "@/server/modules/menu/menu.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string }> };

export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const { actor } = await menuActor(r, (await c.params).businessId);
    return apiOk(
      await menuService.createDealCombo(actor, CreateDealComboSchema.parse(await readJson(r)), requestId),
      requestId,
      { status: 201 },
    );
  });
}
