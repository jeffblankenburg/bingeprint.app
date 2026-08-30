import { createAdminClient } from "@/lib/supabase/admin";
import { needsRecommendations, generateRecommendations } from "@/lib/recommendations/engine";
import { RecCard } from "@/components/recommendations/rec-card";

type Show = { id: string; tmdb_id: number; name: string; poster_path: string | null };
type Row = { score: number; reason: unknown; collection: string; shows: Show | null };

/**
 * Recommendation shelves on the dashboard: a blended "Perfect For You" row plus
 * one row per taste genre ("More Comedy You'll Love"). Generates on first view
 * (or when stale), then reads the cached set. Rendered in a Suspense boundary so
 * the rest of the dashboard never waits on it.
 */
export async function RecommendationShelves({ userId }: { userId: string }) {
  const admin = createAdminClient();

  if (await needsRecommendations(admin, userId)) {
    await generateRecommendations(userId);
  }

  const { data } = await admin
    .from("recommendations")
    .select("score, reason, collection, shows(id, tmdb_id, name, poster_path)")
    .eq("user_id", userId)
    .order("score", { ascending: false });

  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !!r.shows);
  if (rows.length === 0) return null;

  const byCollection = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byCollection.get(r.collection) ?? [];
    list.push(r);
    byCollection.set(r.collection, list);
  }

  const perfect = byCollection.get("perfect_for_you") ?? [];
  const becauseRows = [...byCollection.entries()]
    .filter(([c]) => c.startsWith("because_"))
    .map(([, list]) => ({
      seed: (list[0]?.reason as { seed?: string })?.seed ?? "something you love",
      list,
    }))
    .filter((g) => g.list.length >= 3); // skip thin rows

  return (
    <div className="space-y-8">
      {perfect.length > 0 && (
        <Shelf title="Perfect For You" note="because of what you watch">
          {perfect.map((r) => (
            <RecCard
              key={r.shows!.id}
              showId={r.shows!.id}
              tmdbId={r.shows!.tmdb_id}
              name={r.shows!.name}
              posterPath={r.shows!.poster_path}
              because={((r.reason as { because?: string[] })?.because ?? []).slice(0, 2)}
            />
          ))}
        </Shelf>
      )}

      {becauseRows.map(({ seed, list }) => (
        <Shelf key={seed} title={`Because You Loved ${seed}`} note="similar shows to explore">
          {list.map((r) => (
            <RecCard
              key={r.shows!.id}
              showId={r.shows!.id}
              tmdbId={r.shows!.tmdb_id}
              name={r.shows!.name}
              posterPath={r.shows!.poster_path}
              because={[]}
            />
          ))}
        </Shelf>
      ))}
    </div>
  );
}

function Shelf({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="font-mono text-xs text-muted-foreground">{note}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
