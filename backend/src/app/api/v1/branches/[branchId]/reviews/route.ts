import { z } from "zod";
import { apiHandler, apiOk } from "@/server/http/response";
import { reviewService } from "@/server/modules/reviews/review.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ branchId: string }> };

export async function GET(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const branchId = z.string().uuid().parse((await context.params).branchId);
    const limit = z.coerce.number().int().min(1).max(12).catch(6).parse(
      new URL(request.url).searchParams.get("limit") ?? 6,
    );
    return apiOk(await reviewService.publicForBranch(branchId, limit), requestId);
  });
}
