import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, backendUrl } from "@/lib/backend";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    await fetch(backendUrl("/api/v1/auth/logout"), {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ data: { loggedOut: true } });
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) response.cookies.set(name, "", { path: "/", maxAge: 0 });
  return response;
}
