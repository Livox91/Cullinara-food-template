import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { SetOrderAcceptanceSchema } from "@/server/modules/branches/branch.schemas";
import { branchService } from "@/server/modules/branches/branch.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ businessId: string; branchId: string }> };

export async function PUT(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const params = await context.params;
    const businessId = z.string().uuid().parse(params.businessId);
    const branchId = z.string().uuid().parse(params.branchId);
    const actor = await requireBusinessActor(principal, {
      businessId,
      branchId,
      capability: "branch.manage",
    });
    const input = SetOrderAcceptanceSchema.parse(await readJson(request));
    return apiOk(
      await branchService.setOrderAcceptance(actor, branchId, input, requestId),
      requestId,
    );
  });
}
