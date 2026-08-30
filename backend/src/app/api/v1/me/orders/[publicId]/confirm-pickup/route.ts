import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicId } from "@/server/modules/orders/order.route";
import { customerOrderService } from "@/server/modules/orders/order.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ publicId: string }> };

export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const principal = await requirePrincipal(r);
    await requireActiveUser(principal);
    return apiOk(
      await customerOrderService.confirmPickup(
        principal.userId,
        publicId((await c.params).publicId),
      ),
      requestId,
    );
  });
}
