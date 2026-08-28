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
