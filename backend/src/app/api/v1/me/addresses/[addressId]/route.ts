import { z } from "zod";
import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateAddressSchema } from "@/server/modules/customers/customer.schemas";
import { customerService } from "@/server/modules/customers/customer.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ addressId: string }> };
async function user(r: Request) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return p.userId;
}
export async function PATCH(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await customerService.updateAddress(
        await user(r),
        z
          .string()
          .uuid()
          .parse((await c.params).addressId),
        UpdateAddressSchema.parse(await readJson(r)),
      ),
      requestId,
    ),
  );
}
export async function DELETE(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await customerService.removeAddress(
        await user(r),
        z
          .string()
          .uuid()
          .parse((await c.params).addressId),
      ),
      requestId,
    ),
  );
}
