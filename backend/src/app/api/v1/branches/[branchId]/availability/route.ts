import { z } from "zod";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicBranchService } from "@/server/modules/branches/public-branch.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ branchId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const value = new URL(r.url).searchParams.get("scheduledFor");
    return apiOk(
      await publicBranchService.availability(
        z
          .string()
          .uuid()
          .parse((await c.params).branchId),
        value ? z.coerce.date().parse(value) : undefined,
      ),
      requestId,
    );
  });
}
