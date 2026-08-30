import { z } from "zod";
import { apiHandler, apiOk } from "@/server/http/response";
import { publicBranchService } from "@/server/modules/branches/public-branch.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ branchId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await publicBranchService.get(
        z
          .string()
          .uuid()
          .parse((await c.params).branchId),
      ),
      requestId,
    ),
  );
}
