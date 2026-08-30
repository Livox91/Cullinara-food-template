import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { id, menuActor } from "@/server/modules/menu/menu.route";
import { ConfigureBranchModifierSchema } from "@/server/modules/menu/menu.schemas";
import { menuService } from "@/server/modules/menu/menu.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = {
  params: Promise<{ businessId: string; branchId: string; optionId: string }>;
};
export async function PUT(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params;
    const branchId = id(p.branchId);
    const { actor } = await menuActor(r, p.businessId, branchId);
    return apiOk(
      await menuService.configureOption(
        actor,
        branchId,
        id(p.optionId),
        ConfigureBranchModifierSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
    );
  });
}
