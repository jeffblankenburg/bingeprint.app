import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Mark every *aired* episode of a show as watched, never an unaired one. This is
 * what "I've watched this show" means — you can't have seen next month's episode,
 * and a future episode must still surface as new once it airs. Idempotent.
 */
export async function markAllAiredWatched(
  supabase: Supabase,
  userId: string,
  showId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: eps } = await supabase
    .from("episodes")
    .select("id, air_date")
    .eq("show_id", showId)
    .gt("season_number", 0)
    .lte("air_date", today);
  const ids = (eps ?? []).map((e) => e.id);
  if (ids.length === 0) return;
  await supabase.from("user_episodes").upsert(
    ids.map((id) => ({ user_id: userId, episode_id: id, show_id: showId })),
    { onConflict: "user_id,episode_id", ignoreDuplicates: true },
  );
}
