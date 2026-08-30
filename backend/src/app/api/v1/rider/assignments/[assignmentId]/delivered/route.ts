import { apiHandler, apiOk } from "@/server/http/response";
import { assignmentId, riderUser } from "@/server/modules/riders/rider.route";
import { riderService } from "@/server/modules/riders/rider.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ assignmentId: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await riderService.delivered(
        await riderUser(r),
        assignmentId((await c.params).assignmentId),
      ),
      requestId,
    ),
  );
}
