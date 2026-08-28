"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  toggleEpisodeWatched,
  markSeasonWatched,
  markAllWatched,
} from "@/lib/tracking/actions";
import { BarMeter } from "@/components/brand/smpte-bars";
import { cn } from "@/lib/utils";

type Ep = {
  id: string;
  season_number: number;
  episode_number: number;
  name: string | null;
  air_date: string | null;
};
type Season = { season_number: number; name: string | null; episodes: Ep[] };

export function SeasonsTracker({
  showId,
  seasons,
  initialWatched,
  authed,
}: {
  showId: string;
  seasons: Season[];
  initialWatched: string[];
  authed: boolean;
}) {
  const [watched, setWatched] = useState<Set<string>>(new Set(initialWatched));
  const [, startTransition] = useTransition();

  const allEpisodeIds = seasons.flatMap((s) => s.episodes.map((e) => e.id));
  const total = allEpisodeIds.length;
  const watchedTotal = allEpisodeIds.filter((id) => watched.has(id)).length;
  const pct = total > 0 ? Math.round((watchedTotal / total) * 100) : 0;
  const complete = total > 0 && watchedTotal >= total;

  function optimistically(mutate: (next: Set<string>) => void, action: () => Promise<unknown>) {
    setWatched((prev) => {
      const next = new Set(prev);
      mutate(next);
      return next;
    });
    startTransition(() => {
      void action();
    });
  }

  function toggleEp(ep: Ep) {
    const next = !watched.has(ep.id);
    optimistically(
      (set) => (next ? set.add(ep.id) : set.delete(ep.id)),
      () => toggleEpisodeWatched(showId, ep.id, next),
    );
  }

  function markSeason(season: Season) {
    optimistically(
      (set) => season.episodes.forEach((e) => set.add(e.id)),
      () => markSeasonWatched(showId, season.season_number),
    );
  }

  function markEverything() {
    optimistically(
      (set) => allEpisodeIds.forEach((id) => set.add(id)),
      () => markAllWatched(showId),
    );
  }

  return (
    <section className="mt-7 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Seasons
        </h2>
        {authed && !complete && (
          <button
            onClick={markEverything}
            className="rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-accent"
          >
            Mark all watched
          </button>
        )}
      </div>

      {authed && total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="tabular font-mono text-muted-foreground">
              {watchedTotal} of {total} watched
            </span>
            <span className="tabular font-mono font-medium text-primary">{pct}%</span>
          </div>
          <BarMeter value={pct} />
        </div>
      )}

      <div className="space-y-2">
        {seasons.map((season, i) => {
          const sWatched = season.episodes.filter((e) => watched.has(e.id)).length;
          const sComplete = season.episodes.length > 0 && sWatched >= season.episodes.length;
          return (
            <details
              key={season.season_number}
              open={i === seasons.length - 1}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                <span className="font-display font-medium">
                  {season.name ?? `Season ${season.season_number}`}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular font-mono text-xs text-muted-foreground">
                    {authed ? `${sWatched}/${season.episodes.length}` : `${season.episodes.length} eps`}
                  </span>
                  {authed && !sComplete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        markSeason(season);
                      }}
                      className="rounded border border-input px-1.5 py-0.5 text-[10px] hover:bg-accent"
                    >
                      Mark season
                    </button>
                  )}
                </span>
              </summary>
              <ul className="divide-y border-t">
                {season.episodes.map((ep) => {
                  const isWatched = watched.has(ep.id);
                  return (
                    <li key={ep.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                      {authed ? (
                        <button
                          onClick={() => toggleEp(ep)}
                          aria-pressed={isWatched}
                          aria-label={isWatched ? "Mark unwatched" : "Mark watched"}
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isWatched
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input text-transparent hover:border-ring",
                          )}
                        >
                          <Check className="size-3.5" />
                        </button>
                      ) : (
                        <span className="w-6 shrink-0" />
                      )}
                      <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {`S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          isWatched && "text-muted-foreground line-through decoration-muted-foreground/40",
                        )}
                      >
                        <span className="font-medium">{ep.name ?? "TBA"}</span>
                        {ep.air_date && (
                          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                            {ep.air_date}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
