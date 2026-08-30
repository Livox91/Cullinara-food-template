import { apiHandler, apiOk } from "@/server/http/response";
import { orderActor } from "@/server/modules/orders/order.route";
import { OrderListSchema } from "@/server/modules/orders/order.schemas";
import { businessOrderService } from "@/server/modules/orders/order.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ businessId: string; branchId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params,
      { actor, branchId } = await orderActor(r, p, "order.read");
    return apiOk(
      await businessOrderService.list(
        actor,
        branchId,
        OrderListSchema.parse(Object.fromEntries(new URL(r.url).searchParams)),
      ),
      requestId,
    );
  });
}
