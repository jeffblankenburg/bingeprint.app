import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getInsights } from "@/lib/bingeprint/insights";
import { SmpteBars, BarMeter, SMPTE_BARS } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Insights" };

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
