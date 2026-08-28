import { NextResponse, type NextRequest } from "next/server";
import { importShow } from "@/lib/tv/ingest";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Imports (or refreshes) a show and its full season/episode tree from the
 * provider into the canonical cache. Returns a small summary of what landed.
 *
 * GET /api/tv/import?id=<tmdbId>[&force=1]
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!id) {
    return NextResponse.json({ error: "missing ?id=<tmdbId>" }, { status: 400 });
  }

  try {
    const showId = await importShow(id, { force });
    const admin = createAdminClient();
    const [{ data: show }, { count: episodeCount }, { count: seasonCount }] =
      await Promise.all([
        admin.from("shows").select("id, name, number_of_seasons, status").eq("id", showId).single(),
        admin.from("episodes").select("*", { count: "exact", head: true }).eq("show_id", showId),
        admin.from("seasons").select("*", { count: "exact", head: true }).eq("show_id", showId),
      ]);

    return NextResponse.json({
      ok: true,
      showId,
      name: show?.name,
      status: show?.status,
      seasons: seasonCount,
      episodes: episodeCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "import failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
