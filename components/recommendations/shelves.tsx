import { createAdminClient } from "@/lib/supabase/admin";
import { needsRecommendations, generateRecommendations } from "@/lib/recommendations/engine";
import { RecRow } from "@/components/recommendations/rec-row";
import type { RecItem } from "@/components/recommendations/rec-card";

type Show = { id: string; tmdb_id: number; name: string; poster_path: string | null };
type Reason = { because?: string[]; seed?: string; off_service?: boolean };
type Row = { score: number; reason: Reason; collection: string; shows: Show | null };

/**
 * Recommendation shelves on the dashboard: a blended "Perfect For You" row plus
 * a "Because You Loved X" row per top seed. Generates on first view (or when
 * stale), then reads the cached set. Rendered in a Suspense boundary so the rest
 * of the dashboard never waits on it.
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

  const toItems = (list: Row[], withBecause: boolean): RecItem[] =>
    list.map((r) => ({
      showId: r.shows!.id,
      tmdbId: r.shows!.tmdb_id,
      name: r.shows!.name,
      posterPath: r.shows!.poster_path,
      because: withBecause ? (r.reason.because ?? []).slice(0, 2) : [],
      offService: !!r.reason.off_service,
    }));

  const perfect = byCollection.get("perfect_for_you") ?? [];
  const becauseRows = [...byCollection.entries()]
    .filter(([c]) => c.startsWith("because_"))
    .map(([, list]) => ({ seed: list[0]?.reason.seed ?? "something you love", list }))
    .filter((g) => g.list.length >= 3);

  return (
    <div className="space-y-8">
      {perfect.length > 0 && (
        <Shelf title="Perfect For You" note="because of what you watch">
          <RecRow items={toItems(perfect, true)} />
        </Shelf>
      )}

      {becauseRows.map(({ seed, list }) => (
        <Shelf key={seed} title={`Because You Loved ${seed}`} note="similar shows to explore">
          <RecRow items={toItems(list, false)} size={10} />
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
      {children}
    </section>
  );
}
