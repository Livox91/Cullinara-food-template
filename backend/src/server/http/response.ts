import { getRequestId, withRequestId } from "@/server/http/request-id";
import { toHttpError } from "@/server/http/errors";

export interface ApiMeta {
  requestId: string;
  [key: string]: unknown;
}

export function apiOk<T>(
  data: T,
  requestId: string,
  init: ResponseInit = {},
): Response {
  return Response.json(
    { data, meta: { requestId } },
    { ...init, headers: withRequestId(init.headers, requestId) },
  );
}

export async function apiHandler(
  request: Request,
  handler: (context: { requestId: string }) => Promise<Response>,
): Promise<Response> {
  const requestId = getRequestId(request);
  try {
    const response = await handler({ requestId });
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return toHttpError(error, requestId);
  }
}
