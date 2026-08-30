import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { SetMemberBranchAccessSchema } from "@/server/modules/businesses/business.schemas";
import { businessService } from "@/server/modules/businesses/business.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ businessId: string; membershipId: string }>;
};

export async function PUT(request: Request, context: Context) {
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
    const input = SetMemberBranchAccessSchema.parse(await readJson(request));
    return apiOk(
      await businessService.setMemberBranchAccess(
        actor,
        params.membershipId,
        input,
        requestId,
      ),
      requestId,
    );
  });
}
