import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { InitializePaymentSchema } from "@/server/modules/payments/payment.schemas";
import { paymentService } from "@/server/modules/payments/payment.service";
import { publicId } from "@/server/modules/orders/order.route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ publicId: string }> };
async function ctx(r: Request, c: C) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return { userId: p.userId, id: publicId((await c.params).publicId) };
}
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await ctx(r, c);
    return apiOk(await paymentService.listCustomer(x.userId, x.id), requestId);
  });
}
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const x = await ctx(r, c),
      body = InitializePaymentSchema.parse(await readJson(r));
    return apiOk(
      await paymentService.initialize(x.userId, x.id, body.method),
      requestId,
      { status: 201 },
    );
  });
}
