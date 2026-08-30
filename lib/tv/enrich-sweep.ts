import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enrichEpisodeCredits } from "./enrich";

/**
 * Backstop for exact per-episode credits. Enrichment normally runs inline
 * (via `after()`) when a show is first tracked, but that can die partway, and
 * `sync-metadata` adds new episodes to returning shows whose credits then start
 * out un-enriched. This sweep finds tracked shows that still have gaps and fills
 * them — `enrichEpisodeCredits` only touches episodes with a null
 * `credits_synced_at`, so re-running it is cheap and idempotent.
 *
 * Bounded per run (a handful of shows) so it fits a cron invocation; the daily
 * cadence drains any backlog over successive runs.
 */
export async function sweepEpisodeCredits(
  showLimit = 5,
): Promise<{ enriched: number; shows: number }> {
  const admin = createAdminClient();

  // Distinct shows anyone tracks.
  const { data: tracked } = await admin.from("user_shows").select("show_id");
  const trackedIds = [...new Set((tracked ?? []).map((t) => t.show_id))];
  if (trackedIds.length === 0) return { enriched: 0, shows: 0 };

  // Of those, the ones with at least one un-enriched real episode.
  const { data: gaps } = await admin
    .from("episodes")
    .select("show_id")
    .in("show_id", trackedIds)
    .is("credits_synced_at", null)
    .gt("season_number", 0);

  const showIds = [...new Set((gaps ?? []).map((g) => g.show_id))].slice(0, showLimit);
  if (showIds.length === 0) return { enriched: 0, shows: 0 };

  let enriched = 0;
  // Sequential across shows: each show already fans out episodes internally,
  // and this keeps total TMDB concurrency bounded.
  for (const showId of showIds) {
    try {
      const r = await enrichEpisodeCredits(showId);
      enriched += r.enriched;
    } catch {
      // best-effort; a later run retries the remaining gaps
    }
  }

  return { enriched, shows: showIds.length };
}
