import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { CreateCouponSchema } from "@/server/modules/coupons/coupon.schemas";
import { couponAdminService } from "@/server/modules/coupons/coupon.service";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string }> };
async function actor(r: Request, c: C) {
  const p = await requirePrincipal(r),
    businessId = z
      .string()
      .uuid()
      .parse((await c.params).businessId);
  return requireBusinessActor(p, { businessId, capability: "business.manage" });
}
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(await couponAdminService.list(await actor(r, c)), requestId),
  );
}
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await couponAdminService.create(
        await actor(r, c),
        CreateCouponSchema.parse(await readJson(r)),
        requestId,
      ),
      requestId,
      { status: 201 },
    ),
  );
}
