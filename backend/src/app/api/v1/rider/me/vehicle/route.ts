import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { riderUser } from "@/server/modules/riders/rider.route";
import { VehicleSchema } from "@/server/modules/riders/rider.schemas";
import { riderService } from "@/server/modules/riders/rider.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await riderService.vehicle(
        await riderUser(r),
        VehicleSchema.parse(await readJson(r)),
      ),
      requestId,
    ),
  );
}
