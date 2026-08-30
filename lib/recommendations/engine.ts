import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/tv/provider";
import { importShowCore } from "@/lib/tv/ingest";
import type { ProviderShowSummary } from "@/lib/tv/provider";
import type { TablesInsert } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createAdminClient>;

const MAX_SEEDS = 14;
const BECAUSE_ROWS = 3; // number of "Because You Loved X" rows
const IMPORT_POOL = 70; // candidates to import (poster + watch providers) before filtering
const PERFECT_TARGET = 14; // size of the blended "Perfect For You" row
const BECAUSE_TARGET = 12; // size of each "Because You Loved X" row
const REGEN_TTL_MS = 1000 * 60 * 60 * 12; // 12h

type Candidate = {
  tmdbId: number;
  summary: ProviderShowSummary;
  seeds: Set<string>; // seed names that surfaced this via TMDB's graph
  weight: number; // accumulated graph weight across seeds
  bestRank: Map<string, number>; // per-seed strength, for "Because You Loved X"
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
 * Recommendation engine. Everything is derived from TMDB's show-to-show graph so
 * it stays anchored to what the user actually loves (top-rated-by-genre browsing
 * is a global signal, not a personal one — it surfaces beloved anime/kids shows
 * to an adult-comedy watcher). Seeds include watched/watching shows AND onboarding
 * ratings (loved/liked), so a brand-new user still gets recs.
 *
 * Two shelf types:
 *   • "Perfect For You" — candidates surfaced by the MOST seeds (cuts across the
 *     user's whole taste), each with a "because you loved A, B" explanation.
 *   • "Because You Loved X" — one row per top seed, that show's closest matches.
 *
 * Candidates are imported wide, then HARD-filtered to the streaming services the
 * user actually has before anything is stored.
 */
export async function generateRecommendations(userId: string): Promise<number> {
  const admin = createAdminClient();
  const provider = getProvider();

  // ── Seeds: favorites/loved first, then watched/watching, then liked. ────────
  const [{ data: showSeedRows }, { data: ratingRows }] = await Promise.all([
    admin
      .from("user_shows")
      .select("is_favorite, updated_at, shows(id, tmdb_id, name)")
      .eq("user_id", userId)
      .in("status", ["watching", "watched"])
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(MAX_SEEDS),
    admin
      .from("user_ratings")
      .select("reaction, shows(id, tmdb_id, name)")
      .eq("user_id", userId)
      .in("reaction", ["loved", "liked"]),
  ]);

  type Seed = { id: string; tmdb_id: number; name: string; weight: number; favorite: boolean };
  const seedById = new Map<string, Seed>();
  for (const r of showSeedRows ?? []) {
    const s = r.shows as { id: string; tmdb_id: number; name: string } | null;
    if (s?.id) seedById.set(s.id, { ...s, weight: r.is_favorite ? 2 : 1.5, favorite: r.is_favorite });
  }
  for (const r of ratingRows ?? []) {
    const s = r.shows as { id: string; tmdb_id: number; name: string } | null;
    if (!s?.id || seedById.has(s.id)) continue;
    seedById.set(s.id, { ...s, weight: r.reaction === "loved" ? 2 : 1, favorite: r.reaction === "loved" });
  }
  const seeds = [...seedById.values()];

  if (seeds.length === 0) {
    await touch(admin, userId);
    return 0;
  }

  // ── Exclusions: everything in the library + anything dismissed. ─────────────
  const [{ data: libRows }, { data: fbRows }, { data: svcRows }] = await Promise.all([
    admin.from("user_shows").select("shows(tmdb_id)").eq("user_id", userId),
    admin.from("recommendation_feedback").select("shows(tmdb_id)").eq("user_id", userId),
    admin
      .from("user_streaming_services")
      .select("streaming_services(tmdb_id)")
      .eq("user_id", userId),
  ]);
  const excluded = new Set<number>();
  for (const r of [...(libRows ?? []), ...(fbRows ?? [])]) {
    const t = (r.shows as { tmdb_id: number } | null)?.tmdb_id;
    if (t) excluded.add(t);
  }
  const userServiceIds = new Set(
    (svcRows ?? [])
      .map((r) => (r.streaming_services as { tmdb_id: number } | null)?.tmdb_id)
      .filter((t): t is number => !!t),
  );

  // ── Candidate pool from the graph. ──────────────────────────────────────────
  const pool = new Map<number, Candidate>();
  await mapWithConcurrency(seeds, 6, async (seed) => {
    const recs = await provider.getRecommendations(String(seed.tmdb_id)).catch(() => []);
    recs.forEach((summary, i) => {
      const tmdbId = Number(summary.providerId);
      if (excluded.has(tmdbId)) return;
      const rank = 1 - i / Math.max(recs.length, 1); // 1 at top, →0 at tail
      let c = pool.get(tmdbId);
      if (!c) {
        c = { tmdbId, summary, seeds: new Set(), weight: 0, bestRank: new Map() };
        pool.set(tmdbId, c);
      }
      c.seeds.add(seed.name);
      c.weight += seed.weight * rank;
      c.bestRank.set(seed.name, Math.max(c.bestRank.get(seed.name) ?? 0, rank));
    });
  });

  if (pool.size === 0) {
    await touch(admin, userId);
    return 0;
  }

  // ── Import a wide pool (best cross-seed matches) for availability. ──────────
  const score = (c: Candidate) => c.seeds.size * 3 + c.weight;
  const toImport = [...pool.values()].sort((a, b) => score(b) - score(a)).slice(0, IMPORT_POOL);
  await mapWithConcurrency(toImport, 6, async (c) => {
    await importShowCore(c.summary.providerId).catch(() => {});
  });

  // ── Resolve local ids + HARD streaming filter (if the user set services). ───
  const tmdbIds = toImport.map((c) => c.tmdbId);
  const { data: showRows } = await admin.from("shows").select("id, tmdb_id").in("tmdb_id", tmdbIds);
  const showIdByTmdb = new Map((showRows ?? []).map((s) => [s.tmdb_id, s.id]));

  let watchable: Set<string> | null = null;
  if (userServiceIds.size > 0) {
    const localIds = [...showIdByTmdb.values()];
    const { data: streamRows } = await admin
      .from("show_streaming")
      .select("show_id, streaming_services(tmdb_id)")
      .in("show_id", localIds)
      .eq("region", "US")
      .in("offer_type", ["flatrate", "ads", "free"]);
    watchable = new Set<string>();
    for (const r of streamRows ?? []) {
      const t = (r.streaming_services as { tmdb_id: number } | null)?.tmdb_id;
      if (t && userServiceIds.has(t)) watchable.add(r.show_id);
    }
  }

  const eligible = toImport
    .map((c) => ({ c, showId: showIdByTmdb.get(c.tmdbId) }))
    .filter((x): x is { c: Candidate; showId: string } =>
      !!x.showId && (watchable ? watchable.has(x.showId) : true),
    );
  const byTmdb = new Map(eligible.map((x) => [x.c.tmdbId, x]));

  // ── Assemble shelves. A show lands in one row only. ─────────────────────────
  const used = new Set<string>();
  const recs: TablesInsert<"recommendations">[] = [];

  // Perfect For You: strongest cross-seed matches.
  eligible
    .slice()
    .sort((a, b) => score(b.c) - score(a.c))
    .slice(0, PERFECT_TARGET)
    .forEach(({ c, showId }) => {
      used.add(showId);
      recs.push({
        user_id: userId,
        show_id: showId,
        collection: "perfect_for_you",
        score: score(c),
        reason: { because: [...c.seeds].slice(0, 3) },
      });
    });

  // Because You Loved X: one row per top seed (favorites/most-recent first),
  // that seed's closest still-unused matches.
  let rows = 0;
  for (const seed of seeds) {
    if (rows >= BECAUSE_ROWS) break;
    const picks = eligible
      .filter((x) => !used.has(x.showId) && x.c.bestRank.has(seed.name))
      .sort((a, b) => (b.c.bestRank.get(seed.name)! - a.c.bestRank.get(seed.name)!))
      .slice(0, BECAUSE_TARGET);
    if (picks.length < 3) continue; // skip thin rows
    rows++;
    for (const { c, showId } of picks) {
      used.add(showId);
      recs.push({
        user_id: userId,
        show_id: showId,
        collection: `because_${seed.tmdb_id}`,
        score: c.bestRank.get(seed.name)! * 10,
        reason: { seed: seed.name },
      });
    }
  }

  // ── Replace this user's recs. ───────────────────────────────────────────────
  await admin.from("recommendations").delete().eq("user_id", userId);
  if (recs.length) await admin.from("recommendations").insert(recs);
  await touch(admin, userId);

  return recs.length;
}

async function touch(admin: Admin, userId: string) {
  await admin
    .from("profiles")
    .update({ recs_generated_at: new Date().toISOString() })
    .eq("id", userId);
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
