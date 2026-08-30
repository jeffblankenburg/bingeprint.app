"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { importShow } from "@/lib/tv/ingest";
import { markAllAiredWatched } from "@/lib/tracking/watched";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";
import type { ShowStatus } from "@/lib/analytics/events";
import type { TablesUpdate } from "@/lib/supabase/types";

type ActionResult = { ok: boolean; error?: string };

/** Resolve a local show id from a TMDB id, importing detail on first miss. */
async function ensureShowId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  tmdbId: number,
): Promise<string> {
  const { data } = await supabase
    .from("shows")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (data?.id) return data.id;
  // Not even a skeleton row (rare) — import it fully.
  return importShow(String(tmdbId));
}

/** Add a show to the user's library (default: Want to Watch). Idempotent. */
export async function addShowToLibrary(
  tmdbId: number,
  status: ShowStatus = "want_to_watch",
): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  try {
    const showId = await ensureShowId(supabase, tmdbId);
    const { error } = await supabase.from("user_shows").upsert(
      { user_id: user.id, show_id: showId, status },
      { onConflict: "user_id,show_id", ignoreDuplicates: false },
    );
    if (error) return { ok: false, error: error.message };

    // Import full detail (poster/episodes/cast) in the background so the add
    // returns instantly and the show never looks incomplete. Idempotent.
    after(async () => {
      try {
        await importShow(String(tmdbId));
      } catch {
        // best-effort; a re-visit re-runs the import if this partially failed
      }
    });

    await trackServer("show_added", user.id, {
      show_id: showId,
      status,
      source: "search",
    });
    await flushServerAnalytics();
    revalidatePath("/library");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add show" };
  }
}

/** Change a tracked show's status. */
export async function setShowStatus(
  showId: string,
  from: ShowStatus,
  to: ShowStatus,
): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const patch: TablesUpdate<"user_shows"> = { status: to };
  if (to === "watching") patch.started_at = new Date().toISOString();
  if (to === "watched") patch.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("user_shows")
    .update(patch)
    .eq("user_id", user.id)
    .eq("show_id", showId);
  if (error) return { ok: false, error: error.message };

  // Marking a show Watched means every aired episode is watched (and no unaired
  // one) — so progress is real and a future episode still surfaces as new.
  if (to === "watched") {
    await markAllAiredWatched(supabase, user.id, showId);
  }

  await trackServer("show_status_changed", user.id, { show_id: showId, from, to });
  await flushServerAnalytics();
  revalidatePath("/library");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Remove a show from the user's library. */
export async function removeShowFromLibrary(showId: string): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("user_shows")
    .delete()
    .eq("user_id", user.id)
    .eq("show_id", showId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true };
}

/** Toggle a show as a favorite. */
export async function toggleFavorite(showId: string, next: boolean): Promise<ActionResult> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("user_shows")
    .update({ is_favorite: next })
    .eq("user_id", user.id)
    .eq("show_id", showId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/library");
  return { ok: true };
}
