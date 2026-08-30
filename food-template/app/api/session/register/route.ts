import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, backendUrl, publicSessionCookieOptions, sessionCookieOptions } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const upstream = await fetch(backendUrl("/api/v1/auth/register"), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: await request.text(),
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({ error: { message: "The backend returned an unreadable response." } }));
  if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });

  const response = NextResponse.json({ data: { user: payload.data.user } }, { status: 201 });
  response.cookies.set(ACCESS_COOKIE, payload.data.tokens.accessToken, sessionCookieOptions(payload.data.tokens.accessTokenExpiresInSeconds));
  const refreshSeconds = Math.max(0, Math.floor((Date.parse(payload.data.tokens.refreshTokenExpiresAt) - Date.now()) / 1000));
  response.cookies.set(REFRESH_COOKIE, payload.data.tokens.refreshToken, sessionCookieOptions(refreshSeconds));
  response.cookies.set(USER_COOKIE, Buffer.from(JSON.stringify(payload.data.user)).toString("base64url"), publicSessionCookieOptions(refreshSeconds));
  return response;
}

