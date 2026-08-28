"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type TrackingResult = { ok: boolean; error?: string; watched?: number; total?: number };

/** Count of "real" (non-special) episodes for a show. */
async function realEpisodeCount(supabase: Supabase, showId: string): Promise<number> {
  const { count } = await supabase
    .from("episodes")
    .select("*", { count: "exact", head: true })
    .eq("show_id", showId)
    .gt("season_number", 0);
  return count ?? 0;
}

async function watchedCount(
  supabase: Supabase,
  userId: string,
  showId: string,
): Promise<number> {
  const { count } = await supabase
    .from("user_episodes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("show_id", showId);
  return count ?? 0;
}

/**
 * Keep the library status in step with progress: first watched episode moves a
 * show to Watching (adding it to the library if needed); watching every episode
 * moves it to Watched. Never downgrades a manual Paused/Abandoned.
 */
async function syncStatus(
  supabase: Supabase,
  userId: string,
  showId: string,
): Promise<{ watched: number; total: number }> {
  const [watched, total] = await Promise.all([
    watchedCount(supabase, userId, showId),
    realEpisodeCount(supabase, showId),
  ]);

  const { data: existing } = await supabase
    .from("user_shows")
    .select("status, started_at")
    .eq("user_id", userId)
    .eq("show_id", showId)
    .maybeSingle();

  const complete = total > 0 && watched >= total;
  const status = complete ? "watched" : watched > 0 ? "watching" : existing?.status;

  if (!existing) {
    if (watched > 0) {
      await supabase.from("user_shows").insert({
        user_id: userId,
        show_id: showId,
        status: complete ? "watched" : "watching",
        started_at: new Date().toISOString(),
        completed_at: complete ? new Date().toISOString() : null,
      });
    }
  } else if (existing.status !== "paused" && existing.status !== "abandoned") {
    await supabase
      .from("user_shows")
      .update({
        status,
        started_at: existing.started_at ?? new Date().toISOString(),
        completed_at: complete ? new Date().toISOString() : null,
      })
      .eq("user_id", userId)
      .eq("show_id", showId);
  }

  return { watched, total };
}

/** Mark or unmark a single episode as watched. */
export async function toggleEpisodeWatched(
  showId: string,
  episodeId: string,
  watched: boolean,
): Promise<TrackingResult> {
  const { user, supabase } = await requireUser();

  if (watched) {
    const { error } = await supabase
      .from("user_episodes")
      .upsert(
        { user_id: user.id, episode_id: episodeId, show_id: showId },
        { onConflict: "user_id,episode_id", ignoreDuplicates: true },
      );
    if (error) return { ok: false, error: error.message };
    await trackServer("episode_marked_watched", user.id, { show_id: showId, episode_id: episodeId });
  } else {
    const { error } = await supabase
      .from("user_episodes")
      .delete()
      .eq("user_id", user.id)
      .eq("episode_id", episodeId);
    if (error) return { ok: false, error: error.message };
    await trackServer("episode_unmarked_watched", user.id, { show_id: showId, episode_id: episodeId });
  }

  const { watched: w, total } = await syncStatus(supabase, user.id, showId);
  await flushServerAnalytics();
  revalidatePath(`/show/${showId}`);
  revalidatePath("/dashboard");
  return { ok: true, watched: w, total };
}

/** Mark every episode of a season as watched. */
export async function markSeasonWatched(
  showId: string,
  seasonNumber: number,
): Promise<TrackingResult> {
  const { user, supabase } = await requireUser();

  const { data: eps } = await supabase
    .from("episodes")
    .select("id")
    .eq("show_id", showId)
    .eq("season_number", seasonNumber);
  const rows = (eps ?? []).map((e) => ({
    user_id: user.id,
    episode_id: e.id,
    show_id: showId,
  }));
  if (rows.length > 0) {
    const { error } = await supabase
      .from("user_episodes")
      .upsert(rows, { onConflict: "user_id,episode_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
  }

  await trackServer("season_marked_watched", user.id, {
    show_id: showId,
    season_id: String(seasonNumber),
    episode_count: rows.length,
  });
  const { watched, total } = await syncStatus(supabase, user.id, showId);
  await flushServerAnalytics();
  revalidatePath(`/show/${showId}`);
  revalidatePath("/dashboard");
  return { ok: true, watched, total };
}

/** Mark the entire show watched (all non-special episodes). */
export async function markAllWatched(showId: string): Promise<TrackingResult> {
  const { user, supabase } = await requireUser();

  const { data: eps } = await supabase
    .from("episodes")
    .select("id")
    .eq("show_id", showId)
    .gt("season_number", 0);
  const rows = (eps ?? []).map((e) => ({
    user_id: user.id,
    episode_id: e.id,
    show_id: showId,
  }));
  if (rows.length > 0) {
    const { error } = await supabase
      .from("user_episodes")
      .upsert(rows, { onConflict: "user_id,episode_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
  }

  await trackServer("show_marked_all_watched", user.id, {
    show_id: showId,
    episode_count: rows.length,
  });
  const { watched, total } = await syncStatus(supabase, user.id, showId);
  if (total > 0 && watched >= total) {
    await trackServer("show_completed", user.id, { show_id: showId, episode_count: total });
  }
  await flushServerAnalytics();
  revalidatePath(`/show/${showId}`);
  revalidatePath("/dashboard");
  return { ok: true, watched, total };
}
