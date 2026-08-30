import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateBusinessSchema } from "@/server/modules/businesses/business.schemas";
import { businessService } from "@/server/modules/businesses/business.service";

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
    return apiOk(await businessService.getBusiness(actor), requestId);
  });
}

export async function PATCH(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const businessId = z
      .string()
      .uuid()
      .parse((await context.params).businessId);
    const actor = await requireBusinessActor(principal, {
      businessId,
      capability: "business.manage",
    });
    const input = UpdateBusinessSchema.parse(await readJson(request));
    return apiOk(
      await businessService.updateBusiness(actor, input, requestId),
      requestId,
    );
  });
}
