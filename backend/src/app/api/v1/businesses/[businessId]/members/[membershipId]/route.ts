import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { businessService } from "@/server/modules/businesses/business.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ businessId: string; membershipId: string }>;
};

export async function DELETE(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const params = z
      .object({
        businessId: z.string().uuid(),
        membershipId: z.string().uuid(),
      })
      .parse(await context.params);
    const actor = await requireBusinessActor(principal, {
      businessId: params.businessId,
      capability: "member.manage",
    });
    return apiOk(
      await businessService.revokeMember(actor, params.membershipId, requestId),
      requestId,
    );
  });
}
