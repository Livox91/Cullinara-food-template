import { z } from "zod";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateCartItemSchema } from "@/server/modules/carts/cart.schemas";
import { customerId } from "@/server/modules/carts/cart.route";
import { cartService } from "@/server/modules/carts/cart.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ cartItemId: string }> };
export async function PATCH(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await cartService.update(
        await customerId(r),
        z
          .string()
          .uuid()
          .parse((await c.params).cartItemId),
        UpdateCartItemSchema.parse(await readJson(r)),
      ),
      requestId,
    ),
  );
}
export async function DELETE(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await cartService.remove(
        await customerId(r),
        z
          .string()
          .uuid()
          .parse((await c.params).cartItemId),
      ),
      requestId,
    ),
  );
}
