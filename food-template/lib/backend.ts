const DEFAULT_BACKEND_URL = "http://localhost:3001";

export const ACCESS_COOKIE = "restaurant_access";
export const REFRESH_COOKIE = "restaurant_refresh";
export const USER_COOKIE = "restaurant_user";

export function backendUrl(path: string) {
  const base = (process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

export function publicSessionCookieOptions(maxAge?: number) {
  return { ...sessionCookieOptions(maxAge), httpOnly: true };
}

