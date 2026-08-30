import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoded = request.cookies.get(USER_COOKIE)?.value;
  if (!encoded) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    return NextResponse.json({ data: { user: JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) } });
  } catch {
    return NextResponse.json({ error: { code: "INVALID_SESSION", message: "Your session is invalid. Please sign in again." } }, { status: 401 });
  }
}

