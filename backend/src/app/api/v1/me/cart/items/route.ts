import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import {
  AddCartItemSchema,
  CartIdSchema,
} from "@/server/modules/carts/cart.schemas";
import { customerId } from "@/server/modules/carts/cart.route";
import { cartService } from "@/server/modules/carts/cart.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await cartService.add(
        await customerId(r),
        AddCartItemSchema.parse(await readJson(r)),
      ),
      requestId,
      { status: 201 },
    ),
  );
}
export async function DELETE(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await cartService.clear(
        await customerId(r),
        CartIdSchema.parse(await readJson(r)).cartId,
      ),
      requestId,
    ),
  );
}
