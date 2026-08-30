import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicId } from "@/server/modules/orders/order.route";
import { paymentService } from "@/server/modules/payments/payment.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; publicId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await c.params,
      p = await requirePrincipal(r),
      businessId = z.string().uuid().parse(x.businessId),
      actor = await requireBusinessActor(p, {
        businessId,
        capability: "payment.manage",
      });
    return apiOk(
      await paymentService.listBusiness(actor, publicId(x.publicId)),
      requestId,
    );
  });
}
