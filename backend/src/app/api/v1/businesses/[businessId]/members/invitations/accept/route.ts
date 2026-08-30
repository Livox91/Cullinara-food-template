import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { invitationAcceptanceService } from "@/server/modules/businesses/invitation-acceptance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const { businessId } = await params;
    return apiOk(
      await invitationAcceptanceService.accept(
        principal,
        businessId,
        requestId,
      ),
      requestId,
    );
  });
}
