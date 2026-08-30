import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendUrl, sessionCookieOptions } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function forward(request: NextRequest, accessToken: string, path: string[]) {
  const target = new URL(backendUrl(`/api/v1/${path.join("/")}`));
  target.search = request.nextUrl.search;
  const headers = new Headers({ accept: "application/json", authorization: `Bearer ${accessToken}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.clone().arrayBuffer();
  return fetch(target, { method: request.method, headers, body, cache: "no-store" });
}

async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });

  let refreshed: { accessToken: string; refreshToken: string; accessTokenExpiresInSeconds: number; refreshTokenExpiresAt: string } | undefined;
  if (!accessToken && refreshToken) {
    const result = await refresh(refreshToken);
    if (!result) return expired();
    refreshed = result;
    accessToken = result.accessToken;
  }
  let upstream = await forward(request, accessToken!, path);
  if (upstream.status === 401 && refreshToken) {
    const result = await refresh(refreshToken);
    if (!result) return expired();
    refreshed = result;
    upstream = await forward(request, result.accessToken, path);
  }
  const response = new NextResponse(upstream.body, { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "x-request-id": upstream.headers.get("x-request-id") ?? "" } });
  if (refreshed) {
    response.cookies.set(ACCESS_COOKIE, refreshed.accessToken, sessionCookieOptions(refreshed.accessTokenExpiresInSeconds));
    response.cookies.set(REFRESH_COOKIE, refreshed.refreshToken, sessionCookieOptions(Math.max(0, Math.floor((Date.parse(refreshed.refreshTokenExpiresAt) - Date.now()) / 1000))));
  }
  return response;
}

async function refresh(refreshToken: string) {
  const response = await fetch(backendUrl("/api/v1/auth/refresh"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken }), cache: "no-store" });
  if (!response.ok) return undefined;
  const payload = await response.json();
  return payload.data?.tokens ?? payload.data;
}

function expired() {
  const response = NextResponse.json({ error: { code: "SESSION_EXPIRED", message: "Your session expired. Please sign in again." } }, { status: 401 });
  response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
