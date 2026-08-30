import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { riderUser } from "@/server/modules/riders/rider.route";
import { RiderStatusSchema } from "@/server/modules/riders/rider.schemas";
import { riderService } from "@/server/modules/riders/rider.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PUT(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await riderService.status(
        await riderUser(r),
        RiderStatusSchema.parse(await readJson(r)).status,
      ),
      requestId,
    ),
  );
}
