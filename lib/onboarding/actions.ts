"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { importShowCore } from "@/lib/tv/ingest";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";
import type { Reaction } from "@/lib/analytics/events";

/** Resolve a local show id for a TMDB id, importing core detail on a rare miss. */
async function resolveShowId(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  tmdbId: number,
): Promise<string> {
  const { data } = await supabase.from("shows").select("id").eq("tmdb_id", tmdbId).maybeSingle();
  if (data?.id) return data.id;
  return (await importShowCore(String(tmdbId))).showId;
}

/**
 * Record a quick onboarding reaction. Loved/Liked also mark the show Watched
 * (so it seeds recommendations); Not-for-me is stored as negative feedback so it
 * won't be recommended. "Haven't seen" simply isn't sent.
 */
export async function rateOnboardingShow(
  tmdbId: number,
  reaction: Reaction,
): Promise<{ ok: boolean }> {
  const { user, supabase } = await requireUser();
  const showId = await resolveShowId(supabase, tmdbId);

  // One show-level rating per user (partial-unique index → delete then insert).
  await supabase
    .from("user_ratings")
    .delete()
    .eq("user_id", user.id)
    .eq("show_id", showId)
    .is("episode_id", null);
  await supabase.from("user_ratings").insert({ user_id: user.id, show_id: showId, reaction });

  if (reaction === "loved" || reaction === "liked") {
    await supabase.from("user_shows").upsert(
      {
        user_id: user.id,
        show_id: showId,
        status: "watched",
        is_favorite: reaction === "loved",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,show_id" },
    );
  } else if (reaction === "not_for_me") {
    await supabase
      .from("recommendation_feedback")
      .upsert(
        { user_id: user.id, show_id: showId, feedback: "not_my_thing" },
        { onConflict: "user_id,show_id" },
      );
  }

  await trackServer("onboarding_show_rated", user.id, { show_id: String(tmdbId), reaction });
  await flushServerAnalytics();
  return { ok: true };
}

/** Finish onboarding: mark the profile and head to the dashboard (recs generate there). */
export async function finishOnboarding(): Promise<void> {
  const { user, supabase } = await requireUser();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  await trackServer("onboarding_completed", user.id, { rated_count: 0 });
  await flushServerAnalytics();
  redirect("/dashboard");
}
