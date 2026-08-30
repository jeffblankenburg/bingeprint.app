import "server-only";

import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ContinueItem = {
  show: { id: string; tmdb_id: number; name: string; poster_path: string | null };
  next: {
    season_number: number;
    episode_number: number;
    name: string | null;
  } | null;
  watched: number;
  total: number;
  caughtUp: boolean;
};

export type NewEpisodeItem = {
  show: { id: string; tmdb_id: number; name: string; poster_path: string | null };
  /** Unwatched episodes that aired within the recency window. */
  newCount: number;
  /** The most recent unwatched aired episode (the "it dropped" signal). */
  latest: { season_number: number; episode_number: number; name: string | null; air_date: string };
  /** The earliest unwatched aired episode — where the user should resume. */
  resume: { season_number: number; episode_number: number } | null;
};

/**
 * Shows the user follows that have a freshly-aired episode they haven't watched.
 * This is the "a new episode dropped" signal that belongs at the very top of the
 * dashboard — it covers shows the user had already completed (status = watched),
 * which Continue Watching intentionally skips. Scoped to still-running shows so
 * we don't scan the user's whole finished-series history.
 */
export async function getNewEpisodes(
  supabase: Supabase,
  userId: string,
  windowDays = 30,
): Promise<NewEpisodeItem[]> {
  const { data: rows } = await supabase
    .from("user_shows")
    .select("show_id, shows(id, tmdb_id, name, poster_path, in_production, status)")
    .eq("user_id", userId)
    .in("status", ["watching", "watched", "paused"]);

  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - windowDays * 86400_000).toISOString().slice(0, 10);

  // Only still-running shows can have new episodes — skip ended series.
  const ongoing = (rows ?? []).filter((r) => {
    const s = r.shows as { in_production: boolean | null; status: string | null } | null;
    return s && (s.in_production || /^returning/i.test(s.status ?? ""));
  });

  const items = await Promise.all(
    ongoing.map(async (r) => {
      const show = r.shows as NewEpisodeItem["show"] | null;
      if (!show) return null;

      const [{ data: eps }, { data: watchedRows }] = await Promise.all([
        supabase
          .from("episodes")
          .select("id, season_number, episode_number, name, air_date")
          .eq("show_id", show.id)
          .gt("season_number", 0)
          .order("season_number", { ascending: true })
          .order("episode_number", { ascending: true }),
        supabase
          .from("user_episodes")
          .select("episode_id")
          .eq("user_id", userId)
          .eq("show_id", show.id),
      ]);

      const watched = new Set((watchedRows ?? []).map((w) => w.episode_id));
      const allEps = eps ?? [];
      const unwatchedAired = allEps.filter(
        (e) => e.air_date && e.air_date <= today && !watched.has(e.id),
      );
      const fresh = unwatchedAired.filter((e) => e.air_date! >= cutoff);
      if (fresh.length === 0) return null;

      const latestEp = fresh[fresh.length - 1]; // aired last (list is chronological)
      const resumeEp = unwatchedAired[0]; // earliest unwatched aired

      return {
        show,
        newCount: fresh.length,
        latest: {
          season_number: latestEp.season_number,
          episode_number: latestEp.episode_number,
          name: latestEp.name,
          air_date: latestEp.air_date!,
        },
        resume: resumeEp
          ? { season_number: resumeEp.season_number, episode_number: resumeEp.episode_number }
          : null,
      } satisfies NewEpisodeItem;
    }),
  );

  return items
    .filter((i): i is NewEpisodeItem => i !== null)
    .sort((a, b) => b.latest.air_date.localeCompare(a.latest.air_date));
}

/**
 * For each in-progress show, the next unwatched *aired* episode — the heart of
 * the Continue Watching dashboard. N+1 over the (small) set of watching shows.
 */
export async function getContinueWatching(
  supabase: Supabase,
  userId: string,
  limit = 12,
): Promise<ContinueItem[]> {
  const { data: rows } = await supabase
    .from("user_shows")
    .select("show_id, updated_at, shows(id, tmdb_id, name, poster_path)")
    .eq("user_id", userId)
    .eq("status", "watching")
    .order("updated_at", { ascending: false })
    .limit(limit);

  const today = new Date().toISOString().slice(0, 10);

  const items = await Promise.all(
    (rows ?? []).map(async (r) => {
      const show = r.shows as ContinueItem["show"] | null;
      if (!show) return null;

      const [{ data: eps }, { data: watchedRows }] = await Promise.all([
        supabase
          .from("episodes")
          .select("id, season_number, episode_number, name, air_date")
          .eq("show_id", show.id)
          .gt("season_number", 0)
          .order("season_number", { ascending: true })
          .order("episode_number", { ascending: true }),
        supabase
          .from("user_episodes")
          .select("episode_id")
          .eq("user_id", userId)
          .eq("show_id", show.id),
      ]);

      const watchedSet = new Set((watchedRows ?? []).map((w) => w.episode_id));
      const allEps = eps ?? [];
      const aired = allEps.filter((e) => e.air_date && e.air_date <= today);
      const next = aired.find((e) => !watchedSet.has(e.id)) ?? null;

      return {
        show,
        next: next
          ? {
              season_number: next.season_number,
              episode_number: next.episode_number,
              name: next.name,
            }
          : null,
        watched: watchedSet.size,
        total: allEps.length,
        caughtUp: !next,
      } satisfies ContinueItem;
    }),
  );

  return items.filter((i): i is ContinueItem => i !== null);
}
