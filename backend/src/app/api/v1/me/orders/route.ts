import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { OrderListSchema } from "@/server/modules/orders/order.schemas";
import { customerOrderService } from "@/server/modules/orders/order.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await requirePrincipal(r);
    await requireActiveUser(p);
    return apiOk(
      await customerOrderService.list(
        p.userId,
        OrderListSchema.parse(Object.fromEntries(new URL(r.url).searchParams)),
      ),
      requestId,
    );
  });
}
