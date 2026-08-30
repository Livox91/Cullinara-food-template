import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicId } from "@/server/modules/orders/order.route";
import { RefundSchema } from "@/server/modules/payments/payment.schemas";
import { paymentService } from "@/server/modules/payments/payment.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; publicId: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await c.params,
      p = await requirePrincipal(r),
      businessId = z.string().uuid().parse(x.businessId),
      actor = await requireBusinessActor(p, {
        businessId,
        capability: "payment.manage",
      });
    return apiOk(
      await paymentService.refund(
        actor,
        publicId(x.publicId),
        RefundSchema.parse(await readJson(r)),
      ),
      requestId,
      { status: 201 },
    );
  });
}
