import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(backendUrl(`/api/v1/${path.join("/")}`));
  target.search = request.nextUrl.search;
  const upstream = await fetch(target, { headers: { accept: "application/json" }, cache: "no-store" });
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
