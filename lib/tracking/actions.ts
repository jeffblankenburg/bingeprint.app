"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type TrackingResult = { ok: boolean; error?: string; watched?: number; total?: number };

async function realEpisodeCount(supabase: Supabase, showId: string): Promise<number> {
  const { count } = await supabase
    .from("episodes")
    .select("*", { count: "exact", head: true })
    .eq("show_id", showId)
    .gt("season_number", 0);
  return count ?? 0;
}

async function watchedCount(supabase: Supabase, userId: string, showId: string): Promise<number> {
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
): Promise<{ watched: number; total: number; completed: boolean }> {
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

  return { watched, total, completed: complete };
}

/** Mark a set of episodes as watched. Idempotent. */
export async function markEpisodesWatched(
  showId: string,
  episodeIds: string[],
): Promise<TrackingResult> {
  const { user, supabase } = await requireUser();
  if (episodeIds.length === 0) return { ok: true };

  // Enforce: you can't mark an episode that hasn't aired yet.
  const today = new Date().toISOString().slice(0, 10);
  const { data: eps } = await supabase
    .from("episodes")
    .select("id, air_date")
    .in("id", episodeIds);
  const airedIds = (eps ?? [])
    .filter((e) => e.air_date && e.air_date <= today)
    .map((e) => e.id);
  if (airedIds.length === 0) {
    const { watched, total } = await syncStatus(supabase, user.id, showId);
    return { ok: true, watched, total };
  }

  const { error } = await supabase.from("user_episodes").upsert(
    airedIds.map((id) => ({ user_id: user.id, episode_id: id, show_id: showId })),
    { onConflict: "user_id,episode_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };

  if (airedIds.length === 1) {
    await trackServer("episode_marked_watched", user.id, { show_id: showId, episode_id: episodeIds[0] });
  } else {
    await trackServer("season_marked_watched", user.id, {
      show_id: showId,
      season_id: "",
      episode_count: airedIds.length,
    });
  }

  const { watched, total, completed } = await syncStatus(supabase, user.id, showId);
  if (completed) {
    await trackServer("show_completed", user.id, { show_id: showId, episode_count: total });
  }
  await flushServerAnalytics();
  revalidatePath("/dashboard");
  return { ok: true, watched, total };
}

/** Unmark a set of episodes. Idempotent. */
export async function unmarkEpisodesWatched(
  showId: string,
  episodeIds: string[],
): Promise<TrackingResult> {
  const { user, supabase } = await requireUser();
  if (episodeIds.length === 0) return { ok: true };

  const { error } = await supabase
    .from("user_episodes")
    .delete()
    .eq("user_id", user.id)
    .in("episode_id", episodeIds);
  if (error) return { ok: false, error: error.message };

  if (episodeIds.length === 1) {
    await trackServer("episode_unmarked_watched", user.id, { show_id: showId, episode_id: episodeIds[0] });
  }

  const { watched, total } = await syncStatus(supabase, user.id, showId);
  await flushServerAnalytics();
  revalidatePath("/dashboard");
  return { ok: true, watched, total };
}
