import { NextResponse, type NextRequest } from "next/server";
const methods = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const headers =
  "Content-Type, Authorization, Idempotency-Key, X-Request-Id, X-Webhook-Secret, X-Worker-Secret";
export function proxy(request: NextRequest) {
  const allowed = new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const origin = request.headers.get("origin") ?? "",
    ok = allowed.has(origin);
  const cors: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": headers,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (ok) cors["Access-Control-Allow-Origin"] = origin;
  if (request.method === "OPTIONS")
    return new NextResponse(null, { status: 204, headers: cors });
  const response = NextResponse.next();
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}
export const config = { matcher: "/api/:path*" };
