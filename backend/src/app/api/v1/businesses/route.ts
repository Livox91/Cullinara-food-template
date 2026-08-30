import { requirePrincipal } from "@/server/auth/principal";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { CreateBusinessSchema } from "@/server/modules/businesses/business.schemas";
import { businessService } from "@/server/modules/businesses/business.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    return apiOk(await businessService.listMyBusinesses(principal), requestId);
  });
}

export async function POST(request: Request) {
  return apiHandler(request, async ({ requestId }) => {
    const principal = await requirePrincipal(request);
    const input = CreateBusinessSchema.parse(await readJson(request));
    return apiOk(
      await businessService.createBusiness(principal, input, requestId),
      requestId,
      { status: 201 },
    );
  });
}
