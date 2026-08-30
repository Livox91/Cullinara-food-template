import { apiHandler, apiOk } from "@/server/http/response";
import { CartQuerySchema } from "@/server/modules/carts/cart.schemas";
import { customerId } from "@/server/modules/carts/cart.route";
import { cartService } from "@/server/modules/carts/cart.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const q = CartQuerySchema.parse(
      Object.fromEntries(new URL(r.url).searchParams),
    );
    return apiOk(
      await cartService.getOrCreate(
        await customerId(r),
        q.branchId,
        q.fulfillmentType,
      ),
      requestId,
    );
  });
}
