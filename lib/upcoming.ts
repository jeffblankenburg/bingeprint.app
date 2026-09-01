import "server-only";

import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE, dateOffsetISO } from "@/lib/time";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type UpcomingEpisode = {
  id: string;
  season_number: number;
  episode_number: number;
  name: string | null;
  air_date: string;
  isPremiere: boolean;
  isFinale: boolean;
  show: { id: string; tmdb_id: number; name: string; poster_path: string | null };
};

export type UpcomingBucket = "today" | "week" | "month" | "later";
export type UpcomingGroups = Record<UpcomingBucket, UpcomingEpisode[]>;

/**
 * Upcoming episodes for the shows a user follows (everything but Abandoned),
 * bucketed into Today / This Week / This Month / Later.
 */
export async function getUpcoming(
  supabase: Supabase,
  userId: string,
  tz: string = APP_TIMEZONE,
): Promise<{ groups: UpcomingGroups; total: number }> {
  const isoOffset = (days: number) => dateOffsetISO(days, tz);
  const empty: UpcomingGroups = { today: [], week: [], month: [], later: [] };

  const { data: tracked } = await supabase
    .from("user_shows")
    .select("show_id, status")
    .eq("user_id", userId)
    .neq("status", "abandoned");
  const showIds = (tracked ?? []).map((t) => t.show_id);
  if (showIds.length === 0) return { groups: empty, total: 0 };

  const today = isoOffset(0);
  const { data: eps } = await supabase
    .from("episodes")
    .select(
      "id, season_number, episode_number, name, air_date, shows(id, tmdb_id, name, poster_path)",
    )
    .in("show_id", showIds)
    .gte("air_date", today)
    .order("air_date", { ascending: true })
    .limit(100);

  const week = isoOffset(7);
  const month = isoOffset(31);
  const groups: UpcomingGroups = { today: [], week: [], month: [], later: [] };

  for (const e of eps ?? []) {
    const show = e.shows as UpcomingEpisode["show"] | null;
    if (!show || !e.air_date) continue;
    const item: UpcomingEpisode = {
      id: e.id,
      season_number: e.season_number,
      episode_number: e.episode_number,
      name: e.name,
      air_date: e.air_date,
      isPremiere: e.episode_number === 1,
      isFinale: false, // last-of-season detection would need season counts; skipped for MVP
      show,
    };
    const bucket: UpcomingBucket =
      e.air_date === today
        ? "today"
        : e.air_date <= week
          ? "week"
          : e.air_date <= month
            ? "month"
            : "later";
    groups[bucket].push(item);
  }

  const total = Object.values(groups).reduce((n, list) => n + list.length, 0);
  return { groups, total };
}
