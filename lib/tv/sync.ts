import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { importShow } from "@/lib/tv/ingest";

/**
 * Refresh detail (episodes + air dates + status) for the shows people actually
 * follow, so the Upcoming calendar stays accurate and newly-announced episodes
 * get picked up. Scoped to tracked shows that can still change — returning /
 * in-production, or never fully imported — stalest first. Bounded per run so it
 * fits a cron invocation; rotates via details_synced_at.
 */
export async function syncTrackedShows(
  limit = 40,
  concurrency = 3,
): Promise<{ synced: number; considered: number }> {
  const admin = createAdminClient();

  // Distinct shows anyone tracks.
  const { data: tracked } = await admin.from("user_shows").select("show_id");
  const showIds = [...new Set((tracked ?? []).map((t) => t.show_id))];
  if (showIds.length === 0) return { synced: 0, considered: 0 };

  // Of those, the ones worth refreshing (still changing / never detailed),
  // stalest first.
  const { data: shows } = await admin
    .from("shows")
    .select("tmdb_id, details_synced_at")
    .in("id", showIds)
    .or("in_production.is.true,status.ilike.Returning*,details_synced_at.is.null")
    .order("details_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const batch = shows ?? [];
  let synced = 0;

  await mapWithConcurrency(batch, concurrency, async (s) => {
    try {
      await importShow(String(s.tmdb_id), { force: true });
      synced++;
    } catch {
      // best-effort; a later run retries
    }
  });

  return { synced, considered: batch.length };
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) break;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
