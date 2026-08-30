import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getInsights } from "@/lib/bingeprint/insights";
import { SmpteBars, BarMeter, SMPTE_BARS } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Insights" };

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

function watchTime(mins: number) {
  const hours = Math.round(mins / 60);
  const days = Math.floor(mins / 60 / 24);
  return { hours, days };
}

export default async function InsightsPage() {
  await requireUser();
  const insights = await getInsights();
  const { hours, days } = watchTime(insights.minutes_watched);

  const empty = insights.episodes_watched === 0;

  const stats = [
    { label: "Shows watched", value: insights.shows_watched.toLocaleString() },
    { label: "Episodes watched", value: insights.episodes_watched.toLocaleString() },
    { label: "Hours watched", value: hours.toLocaleString() },
    { label: "Shows completed", value: insights.shows_completed.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Your television, decoded
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Insights</h1>
      </div>

      {empty ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your Bingeprint takes shape as you track. Mark some episodes watched
              and your taste profile appears here.
            </p>
            <Link
              href="/search"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Find a show
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <p className="tabular font-mono text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </section>
          {days >= 1 && (
            <p className="-mt-4 font-mono text-xs text-muted-foreground">
              That&rsquo;s about {days} full {days === 1 ? "day" : "days"} of television.
            </p>
          )}

          {/* Your Bingeprint — genre bars */}
          {insights.genres.length > 0 && (
            <section className="overflow-hidden rounded-xl border bg-card">
              <SmpteBars height="6px" />
              <div className="space-y-4 p-5">
                <h2 className="font-display text-lg font-semibold">Your Bingeprint</h2>
                <div className="space-y-3">
                  {insights.genres.map((g, i) => (
                    <div key={g.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.name}</span>
                        <span className="tabular font-mono text-muted-foreground">{g.pct}%</span>
                      </div>
                      <BarMeter value={g.pct} color={SMPTE_BARS[i % SMPTE_BARS.length]} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Most-watched actors — link to their detail pages */}
          {insights.people.length > 0 && (
            <section className="space-y-3 rounded-xl border bg-card p-5">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Most-watched actors
              </h2>
              <ol className="space-y-1">
                {insights.people.map((p, i) => (
                  <li key={p.tmdb_id}>
                    <Link
                      href={`/person/${p.tmdb_id}`}
                      className="group flex items-center gap-3 rounded-md py-1.5 transition-colors hover:bg-accent"
                    >
                      <span className="w-4 text-center font-mono text-xs text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                        {p.profile_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${TMDB_IMAGE}/w185${p.profile_path}`}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <SmpteBars height="100%" />
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium group-hover:text-primary">
                        {p.name}
                      </span>
                      <span className="tabular font-mono text-xs text-muted-foreground">
                        {p.episodes} eps
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              {insights.people_estimated && (
                <p className="pt-1 font-mono text-[11px] leading-snug text-muted-foreground">
                  Counts are exact where per-episode cast data exists; for episodes
                  without it, we estimate from the show&rsquo;s main cast.
                </p>
              )}
            </section>
          )}

          {/* Eras */}
          {insights.decades.length > 0 && (
            <section className="space-y-3 rounded-xl border bg-card p-5">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Across the eras
              </h2>
              <div className="flex items-end gap-2">
                {insights.decades.map((d) => {
                  const max = Math.max(...insights.decades.map((x) => x.episodes));
                  const h = max > 0 ? Math.max(8, Math.round((d.episodes / max) * 72)) : 8;
                  return (
                    <div key={d.decade} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{ height: `${h}px` }}
                      />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {d.decade}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </>
      )}
    </div>
  );
}
