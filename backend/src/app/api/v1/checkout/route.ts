import { z } from "zod";
import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { CheckoutSchema } from "@/server/modules/checkout/checkout.schemas";
import { checkoutService } from "@/server/modules/checkout/checkout.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await requirePrincipal(r);
    await requireActiveUser(p);
    const key = z
      .string()
      .min(8)
      .max(200)
      .parse(r.headers.get("idempotency-key"));
    return apiOk(
      await checkoutService.checkout(
        p.userId,
        key,
        CheckoutSchema.parse(await readJson(r)),
      ),
      requestId,
      { status: 201 },
    );
  });
}
