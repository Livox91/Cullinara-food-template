import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { UpdateProfileSchema } from "@/server/modules/customers/customer.schemas";
import { customerService } from "@/server/modules/customers/customer.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function user(r: Request) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return p.userId;
}
export async function GET(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(await customerService.getProfile(await user(r)), requestId),
  );
}
export async function PATCH(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await customerService.updateProfile(
        await user(r),
        UpdateProfileSchema.parse(await readJson(r)),
      ),
      requestId,
    ),
  );
}
