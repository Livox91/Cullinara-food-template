import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { couponAdminService } from "@/server/modules/coupons/coupon.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; couponId: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await c.params,
      p = await requirePrincipal(r),
      businessId = z.string().uuid().parse(x.businessId),
      actor = await requireBusinessActor(p, {
        businessId,
        capability: "business.manage",
      });
    return apiOk(
      await couponAdminService.disable(
        actor,
        z.string().uuid().parse(x.couponId),
        requestId,
      ),
      requestId,
    );
  });
}
