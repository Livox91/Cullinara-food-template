import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { FulfillmentSchema } from "@/server/modules/carts/cart.schemas";
import { customerId } from "@/server/modules/carts/cart.route";
import { cartService } from "@/server/modules/carts/cart.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PUT(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const x = FulfillmentSchema.parse(await readJson(r));
    return apiOk(
      await cartService.fulfillment(
        await customerId(r),
        x.cartId,
        x.fulfillmentType,
      ),
      requestId,
    );
  });
}
