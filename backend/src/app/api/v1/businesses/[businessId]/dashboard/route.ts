import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { operationsService } from "@/server/modules/operations/operations.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await requirePrincipal(r),
      businessId = z
        .string()
        .uuid()
        .parse((await c.params).businessId),
      actor = await requireBusinessActor(p, {
        businessId,
        capability: "business.read",
      });
    return apiOk(await operationsService.dashboard(actor), requestId);
  });
}
