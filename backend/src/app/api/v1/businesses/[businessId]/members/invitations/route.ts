import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { InviteMemberSchema } from "@/server/modules/businesses/business.schemas";
import { businessService } from "@/server/modules/businesses/business.service";
import { maintenanceService } from "@/server/modules/workers/maintenance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ businessId: string }> };

export async function POST(request: Request, context: Context) {
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
    const input = InviteMemberSchema.parse(await readJson(request));
    const invitation = await businessService.inviteMember(
      actor,
      input,
      requestId,
    );
    const delivery = await maintenanceService.publishOutbox([
      "BusinessMemberInvited",
    ], invitation.id);
    return apiOk(
      {
        ...invitation,
        emailDelivery:
          delivery.published > 0 && delivery.failed === 0 ? "SENT" : "QUEUED",
      },
      requestId,
      { status: 201 },
    );
  });
}
