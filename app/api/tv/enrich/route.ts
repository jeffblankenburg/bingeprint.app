import { NextResponse, type NextRequest } from "next/server";
import { enrichEpisodeCredits } from "@/lib/tv/enrich";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Enrich a show's exact per-episode credits. Normally triggered automatically
 * when a show is first tracked; this route is a manual/cron backstop to run or
 * resume enrichment. GET /api/tv/enrich?tmdb=<id>|id=<uuid>[&force=1]
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const tmdb = request.nextUrl.searchParams.get("tmdb");
  const idParam = request.nextUrl.searchParams.get("id");
  const force = request.nextUrl.searchParams.get("force") === "1";

  let showId = idParam ?? null;
  if (!showId && tmdb) {
    const { data } = await admin
      .from("shows")
      .select("id")
      .eq("tmdb_id", Number(tmdb))
      .maybeSingle();
    showId = data?.id ?? null;
  }
  if (!showId) {
    return NextResponse.json({ error: "provide ?tmdb= or ?id=" }, { status: 400 });
  }

  const started = Date.now();
  const { enriched } = await enrichEpisodeCredits(showId, { force });
  return NextResponse.json({ ok: true, showId, enriched, elapsed_ms: Date.now() - started });
}
