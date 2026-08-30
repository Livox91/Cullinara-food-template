import { z } from "zod";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicBranchService } from "@/server/modules/branches/public-branch.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Q = z.object({
  city: z.string().trim().min(1).optional(),
  businessSlug: z.string().trim().min(1).optional(),
});
export async function GET(r: Request) {
  return apiHandler(r, async ({ requestId }) => {
    const u = new URL(r.url);
    return apiOk(
      await publicBranchService.list(
        Q.parse(Object.fromEntries(u.searchParams)),
      ),
      requestId,
    );
  });
}
