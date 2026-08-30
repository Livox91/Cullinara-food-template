import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { ReplaceWeeklyHoursSchema } from "@/server/modules/branches/branch.schemas";
import { branchService } from "@/server/modules/branches/branch.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ businessId: string; branchId: string }> };

async function resolve(
  request: Request,
  context: Context,
  capability: "business.read" | "branch.manage",
) {
  const principal = await requirePrincipal(request);
  const params = await context.params;
  const businessId = z.string().uuid().parse(params.businessId);
  const branchId = z.string().uuid().parse(params.branchId);
  const actor = await requireBusinessActor(principal, {
    businessId,
    branchId,
    capability,
  });
  return { actor, branchId };
}

export async function GET(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const { actor, branchId } = await resolve(
      request,
      context,
      "business.read",
    );
    return apiOk(await branchService.getHours(actor, branchId), requestId);
  });
}

export async function PUT(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const { actor, branchId } = await resolve(
      request,
      context,
      "branch.manage",
    );
    const input = ReplaceWeeklyHoursSchema.parse(await readJson(request));
    return apiOk(
      await branchService.replaceWeeklyHours(actor, branchId, input, requestId),
      requestId,
    );
  });
}
