import { z } from "zod";
import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { apiHandler, apiOk } from "@/server/http/response";
import { customerService } from "@/server/modules/customers/customer.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ addressId: string }> };
export async function PUT(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await requirePrincipal(r);
    await requireActiveUser(p);
    return apiOk(
      await customerService.setDefault(
        p.userId,
        z
          .string()
          .uuid()
          .parse((await c.params).addressId),
      ),
      requestId,
    );
  });
}
