import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicId } from "@/server/modules/orders/order.route";
import { ReviewSchema } from "@/server/modules/reviews/review.schemas";
import { reviewService } from "@/server/modules/reviews/review.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ publicId: string }> };
async function x(r: Request, c: C) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return { userId: p.userId, id: publicId((await c.params).publicId) };
}
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const q = await x(r, c);
    return apiOk(await reviewService.get(q.userId, q.id), requestId);
  });
}
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const q = await x(r, c);
    return apiOk(
      await reviewService.create(
        q.userId,
        q.id,
        ReviewSchema.parse(await readJson(r)),
      ),
      requestId,
      { status: 201 },
    );
  });
}
