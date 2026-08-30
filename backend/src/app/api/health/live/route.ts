import { apiHandler, apiOk } from "@/server/http/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(request, async ({ requestId }) =>
    apiOk({ status: "ok", service: "restaurant-backend" }, requestId),
  );
}
