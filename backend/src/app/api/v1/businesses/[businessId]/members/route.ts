import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
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
      capability: "member.manage",
    });
    return apiOk(await businessService.listMembers(actor), requestId);
  });
}
