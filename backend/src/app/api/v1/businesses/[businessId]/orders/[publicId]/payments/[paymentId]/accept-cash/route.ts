import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicId } from "@/server/modules/orders/order.route";
import { paymentService } from "@/server/modules/payments/payment.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type C = {
  params: Promise<{ businessId: string; publicId: string; paymentId: string }>;
};

export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await c.params;
    const principal = await requirePrincipal(r);
    const businessId = z.string().uuid().parse(x.businessId);
    const paymentId = z.string().uuid().parse(x.paymentId);
    const actor = await requireBusinessActor(principal, {
      businessId,
      capability: "payment.manage",
    });
    return apiOk(
      await paymentService.acceptCash(actor, publicId(x.publicId), paymentId),
      requestId,
    );
  });
}
