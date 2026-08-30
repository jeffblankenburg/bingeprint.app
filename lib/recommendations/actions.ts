"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markAllAiredWatched } from "@/lib/tracking/watched";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";
import type { RecommendationFeedback } from "@/lib/analytics/events";

/**
 * Record feedback on a recommendation and remove it from the list. "Interested"
 * adds it to Want to Watch; "already watched" marks it watched. All feedback
 * feeds future recommendation runs (dismissed shows are excluded).
 */
export async function recordRecommendationFeedback(
  showId: string,
  kind: RecommendationFeedback,
): Promise<{ ok: boolean; error?: string }> {
  const { user, supabase } = await requireUser();

  const { error } = await supabase
    .from("recommendation_feedback")
    .upsert(
      { user_id: user.id, show_id: showId, feedback: kind },
      { onConflict: "user_id,show_id" },
    );
  if (error) return { ok: false, error: error.message };

  // Remove it from the current recommendation set.
  await supabase
    .from("recommendations")
    .delete()
    .eq("user_id", user.id)
    .eq("show_id", showId);

  if (kind === "interested") {
    await supabase
      .from("user_shows")
      .upsert(
        { user_id: user.id, show_id: showId, status: "want_to_watch" },
        { onConflict: "user_id,show_id", ignoreDuplicates: true },
      );
    await trackServer("recommendation_accepted", user.id, {
      show_id: showId,
      collection: "perfect_for_you",
    });
    await trackServer("recommendation_added_to_watchlist", user.id, {
      show_id: showId,
      collection: "perfect_for_you",
    });
  } else if (kind === "already_watched") {
    await supabase
      .from("user_shows")
      .upsert(
        {
          user_id: user.id,
          show_id: showId,
          status: "watched",
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,show_id" },
      );
    // Keep episode progress consistent: all aired episodes watched, none unaired.
    await markAllAiredWatched(supabase, user.id, showId);
  } else {
    await trackServer("recommendation_dismissed", user.id, {
      show_id: showId,
      collection: "perfect_for_you",
      feedback: kind,
    });
  }

  await flushServerAnalytics();
  revalidatePath("/dashboard");
  return { ok: true };
}
