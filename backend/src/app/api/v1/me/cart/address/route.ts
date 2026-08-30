import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { AddressSelectionSchema } from "@/server/modules/carts/cart.schemas";
import { customerId } from "@/server/modules/carts/cart.route";
import { cartService } from "@/server/modules/carts/cart.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PUT(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const x = AddressSelectionSchema.parse(await readJson(r));
    return apiOk(
      await cartService.address(await customerId(r), x.cartId, x.addressId),
      requestId,
    );
  });
}
