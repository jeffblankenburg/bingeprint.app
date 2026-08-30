import { NextResponse, type NextRequest } from "next/server";
import { syncTrackedShows } from "@/lib/tv/sync";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Refresh detail for followed, still-changing shows so Upcoming stays accurate
 * and new episodes are captured. GET /api/cron/sync-metadata[?limit=<n>]
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 40;

  const started = Date.now();
  const result = await syncTrackedShows(limit);
  return NextResponse.json({ ok: true, ...result, elapsed_ms: Date.now() - started });
}
