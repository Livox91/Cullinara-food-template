import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { riderUser } from "@/server/modules/riders/rider.route";
import { LocationSchema } from "@/server/modules/riders/rider.schemas";
import { riderService } from "@/server/modules/riders/rider.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await riderService.location(
        await riderUser(r),
        LocationSchema.parse(await readJson(r)),
      ),
      requestId,
      { status: 201 },
    ),
  );
}
