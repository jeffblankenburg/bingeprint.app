import { NextResponse, type NextRequest } from "next/server";
import { sweepEpisodeCredits } from "@/lib/tv/enrich-sweep";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Backstop for exact per-episode credits: fill gaps for tracked shows where the
 * inline enrichment failed or new episodes were added. GET
 * /api/cron/enrich-credits[?limit=<shows>]
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 5;

  const started = Date.now();
  const result = await sweepEpisodeCredits(limit);
  return NextResponse.json({ ok: true, ...result, elapsed_ms: Date.now() - started });
}
