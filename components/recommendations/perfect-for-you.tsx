import { createAdminClient } from "@/lib/supabase/admin";
import { needsRecommendations, generateRecommendations } from "@/lib/recommendations/engine";
import { RecCard } from "@/components/recommendations/rec-card";

/**
 * "Perfect For You" — the recommendation shelf on the dashboard. Generates recs
 * on first view (or when stale), otherwise reads the cached set. Rendered inside
 * a Suspense boundary so the rest of the dashboard never waits on it.
 */
export async function PerfectForYou({ userId }: { userId: string }) {
  const admin = createAdminClient();

  if (await needsRecommendations(admin, userId)) {
    await generateRecommendations(userId);
  }

  const { data } = await admin
    .from("recommendations")
    .select("score, reason, shows(id, tmdb_id, name, poster_path)")
    .eq("user_id", userId)
    .eq("collection", "perfect_for_you")
    .order("score", { ascending: false })
    .limit(20);

  const recs = (data ?? []).filter((r) => r.shows);
  if (recs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Perfect For You</h2>
        <span className="font-mono text-xs text-muted-foreground">
          because of what you watch
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {recs.map((r) => {
          const show = r.shows as {
            id: string;
            tmdb_id: number;
            name: string;
            poster_path: string | null;
          };
          const because = ((r.reason as { because?: string[] })?.because ?? []).slice(0, 2);
          return (
            <RecCard
              key={show.id}
              showId={show.id}
              tmdbId={show.tmdb_id}
              name={show.name}
              posterPath={show.poster_path}
              because={because}
            />
          );
        })}
      </div>
    </section>
  );
}
