import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateCouponSchema } from "@/server/modules/coupons/coupon.schemas";
import { couponAdminService } from "@/server/modules/coupons/coupon.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; couponId: string }> };
export async function PATCH(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await c.params,
      p = await requirePrincipal(r),
      businessId = z.string().uuid().parse(x.businessId),
      actor = await requireBusinessActor(p, {
        businessId,
        capability: "business.manage",
      });
    return apiOk(
      await couponAdminService.update(
        actor,
        z.string().uuid().parse(x.couponId),
        UpdateCouponSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
    );
  });
}
export async function DELETE(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await requirePrincipal(r), x = await c.params,
      businessId = z.string().uuid().parse(x.businessId),
      actor = await requireBusinessActor(p, { businessId, capability: "business.manage" });
    return apiOk(await couponAdminService.delete(actor, z.string().uuid().parse(x.couponId), requestId), requestId);
  });
}
