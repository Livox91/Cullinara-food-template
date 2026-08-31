import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/backend";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/business/login") return NextResponse.next();

  const hasSession = Boolean(
    request.cookies.get(ACCESS_COOKIE)?.value ||
    request.cookies.get(REFRESH_COOKIE)?.value,
  );
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/business/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/business/:path*"],
};
