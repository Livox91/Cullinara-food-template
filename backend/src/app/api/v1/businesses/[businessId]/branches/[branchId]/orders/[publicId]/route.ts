import { apiHandler, apiOk } from "@/server/http/response";
import { orderActor, publicId } from "@/server/modules/orders/order.route";
import { businessOrderService } from "@/server/modules/orders/order.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = {
  params: Promise<{ businessId: string; branchId: string; publicId: string }>;
};
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params,
      { actor, branchId } = await orderActor(r, p, "order.read");
    return apiOk(
      await businessOrderService.get(actor, branchId, publicId(p.publicId)),
      requestId,
    );
  });
}
