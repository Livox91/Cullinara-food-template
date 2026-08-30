import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { CreateBranchSchema } from "@/server/modules/branches/branch.schemas";
import { branchService } from "@/server/modules/branches/branch.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ businessId: string }> };

export async function GET(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const businessId = z
      .string()
      .uuid()
      .parse((await context.params).businessId);
    const actor = await requireBusinessActor(principal, {
      businessId,
      capability: "business.read",
    });
    return apiOk(await branchService.list(actor), requestId);
  });
}

export async function POST(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const businessId = z
      .string()
      .uuid()
      .parse((await context.params).businessId);
    const actor = await requireBusinessActor(principal, {
      businessId,
      capability: "branch.manage",
    });
    const input = CreateBranchSchema.parse(await readJson(request));
    return apiOk(
      await branchService.create(actor, input, requestId),
      requestId,
      { status: 201 },
    );
  });
}
