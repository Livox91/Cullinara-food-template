const REQUEST_ID_HEADER = "x-request-id";

export function getRequestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

export function withRequestId(
  headers: HeadersInit | undefined,
  requestId: string,
): Headers {
  const output = new Headers(headers);
  output.set(REQUEST_ID_HEADER, requestId);
  return output;
}
