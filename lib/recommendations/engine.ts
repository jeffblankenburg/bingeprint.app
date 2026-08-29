import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/tv/provider";
import { importShowCore } from "@/lib/tv/ingest";
import type { ProviderShowSummary } from "@/lib/tv/provider";
import type { TablesInsert } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createAdminClient>;

const MAX_SEEDS = 12;
const IMPORT_TOP = 24; // candidates to import (poster + watch providers) before filtering
const STORE_TOP = 20;
const REGEN_TTL_MS = 1000 * 60 * 60 * 12; // 12h

type Candidate = {
  summary: ProviderShowSummary;
  seeds: Set<string>; // seed show names that surfaced this candidate
  weight: number;
};

/** True if the user has no fresh recommendations and should regenerate. */
export async function needsRecommendations(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("profiles")
    .select("recs_generated_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.recs_generated_at) return true;
  return Date.now() - new Date(data.recs_generated_at).getTime() > REGEN_TTL_MS;
}

/**
 * Weighted-similarity recommendations. Seeds = shows the user watches/loves;
 * candidates = TMDB's "similar shows" for each seed, tallied and ranked by how
 * many seeds surface them (plus popularity), excluding what they already track
 * or dismissed, and — if they've set streaming services — filtered to shows they
 * can actually watch. Each rec keeps an explanation ("Because you loved …").
 */
export async function generateRecommendations(userId: string): Promise<number> {
  const admin = createAdminClient();
  const provider = getProvider();

  // Seeds: favorites + watched/watching, favorites first.
  const { data: seedRows } = await admin
    .from("user_shows")
    .select("is_favorite, updated_at, shows(id, tmdb_id, name)")
    .eq("user_id", userId)
    .in("status", ["watching", "watched"])
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(MAX_SEEDS);

  const seeds = (seedRows ?? [])
    .map((r) => ({
      ...(r.shows as { id: string; tmdb_id: number; name: string } | null),
      is_favorite: r.is_favorite,
    }))
    .filter((s): s is { id: string; tmdb_id: number; name: string; is_favorite: boolean } => !!s.id);

  if (seeds.length === 0) {
    await admin.from("profiles").update({ recs_generated_at: new Date().toISOString() }).eq("id", userId);
    return 0;
  }

  // Exclusions: everything in the library + anything dismissed.
  const [{ data: libRows }, { data: fbRows }, { data: svcRows }] = await Promise.all([
    admin.from("user_shows").select("shows(tmdb_id)").eq("user_id", userId),
    admin.from("recommendation_feedback").select("shows(tmdb_id)").eq("user_id", userId),
    admin
      .from("user_streaming_services")
      .select("streaming_services(tmdb_id)")
      .eq("user_id", userId),
  ]);
  const excluded = new Set<number>();
  for (const r of libRows ?? []) {
    const t = (r.shows as { tmdb_id: number } | null)?.tmdb_id;
    if (t) excluded.add(t);
  }
  for (const r of fbRows ?? []) {
    const t = (r.shows as { tmdb_id: number } | null)?.tmdb_id;
    if (t) excluded.add(t);
  }
  const userServiceIds = new Set(
    (svcRows ?? [])
      .map((r) => (r.streaming_services as { tmdb_id: number } | null)?.tmdb_id)
      .filter((t): t is number => !!t),
  );

  // Tally candidates from each seed's TMDB recommendations.
  const candidates = new Map<number, Candidate>();
  await mapWithConcurrency(seeds, 6, async (seed) => {
    const recs = await provider.getRecommendations(String(seed.tmdb_id)).catch(() => []);
    recs.forEach((summary, i) => {
      const tmdbId = Number(summary.providerId);
      if (excluded.has(tmdbId)) return;
      const existing = candidates.get(tmdbId);
      const w = (seed.is_favorite ? 2 : 1) * (1 - i / Math.max(recs.length, 1)); // higher for top recs
      if (existing) {
        existing.seeds.add(seed.name);
        existing.weight += w;
      } else {
        candidates.set(tmdbId, { summary, seeds: new Set([seed.name]), weight: w });
      }
    });
  });

  if (candidates.size === 0) {
    await admin.from("profiles").update({ recs_generated_at: new Date().toISOString() }).eq("id", userId);
    return 0;
  }

  // Rank: more seeds first, then weight, then community popularity.
  const ranked = [...candidates.values()].sort(
    (a, b) =>
      b.seeds.size - a.seeds.size ||
      b.weight - a.weight ||
      (b.summary.popularity ?? 0) - (a.summary.popularity ?? 0),
  );

  // Import core (poster + watch providers) for the top candidates.
  const top = ranked.slice(0, IMPORT_TOP);
  await mapWithConcurrency(top, 6, async (c) => {
    await importShowCore(c.summary.providerId).catch(() => {});
  });

  // Resolve local show ids + (if the user set services) filter to watchable.
  const tmdbIds = top.map((c) => Number(c.summary.providerId));
  const { data: showRows } = await admin
    .from("shows")
    .select("id, tmdb_id")
    .in("tmdb_id", tmdbIds);
  const showIdByTmdb = new Map((showRows ?? []).map((s) => [s.tmdb_id, s.id]));

  let watchableShowIds: Set<string> | null = null;
  if (userServiceIds.size > 0) {
    const localIds = [...showIdByTmdb.values()];
    const { data: streamRows } = await admin
      .from("show_streaming")
      .select("show_id, region, offer_type, streaming_services(tmdb_id)")
      .in("show_id", localIds)
      .eq("region", "US")
      .in("offer_type", ["flatrate", "ads", "free"]);
    // Shows that have subscription availability, and whether it matches the user.
    const hasUsAvail = new Set<string>();
    const matches = new Set<string>();
    for (const r of streamRows ?? []) {
      hasUsAvail.add(r.show_id);
      const t = (r.streaming_services as { tmdb_id: number } | null)?.tmdb_id;
      if (t && userServiceIds.has(t)) matches.add(r.show_id);
    }
    // Keep: matches, or shows with no known US subscription availability (unknown).
    watchableShowIds = new Set(
      localIds.filter((id) => matches.has(id) || !hasUsAvail.has(id)),
    );
  }

  const finalRecs: TablesInsert<"recommendations">[] = [];
  for (const c of top) {
    const showId = showIdByTmdb.get(Number(c.summary.providerId));
    if (!showId) continue;
    if (watchableShowIds && !watchableShowIds.has(showId)) continue;
    finalRecs.push({
      user_id: userId,
      show_id: showId,
      collection: "perfect_for_you",
      score: c.seeds.size * 100 + c.weight,
      reason: { because: [...c.seeds].slice(0, 3) },
    });
    if (finalRecs.length >= STORE_TOP) break;
  }

  // Replace this user's recs for the collection.
  await admin
    .from("recommendations")
    .delete()
    .eq("user_id", userId)
    .eq("collection", "perfect_for_you");
  if (finalRecs.length) await admin.from("recommendations").insert(finalRecs);
  await admin.from("profiles").update({ recs_generated_at: new Date().toISOString() }).eq("id", userId);

  return finalRecs.length;
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
