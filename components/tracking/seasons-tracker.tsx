"use client";

import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { markEpisodesWatched, unmarkEpisodesWatched } from "@/lib/tracking/actions";
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

function epCode(s: number, e: number) {
  return `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}`;
}

/** Circular watched toggle, shared by episodes and season headers. */
function Tick({
  on,
  onClick,
  label,
  size = "md",
}: {
  on: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-colors",
        size === "md" ? "size-6" : "size-5",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-transparent hover:border-ring",
      )}
    >
      <Check className={size === "md" ? "size-3.5" : "size-3"} />
    </button>
  );
}

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
  const [prompt, setPrompt] = useState<{ ids: string[]; label: string } | null>(null);

  // Chronological flat list + index lookup, for the "earlier episodes" check.
  const ordered = useMemo(() => seasons.flatMap((s) => s.episodes), [seasons]);
  const indexOf = useMemo(() => {
    const m = new Map<string, number>();
    ordered.forEach((e, i) => m.set(e.id, i));
    return m;
  }, [ordered]);

  const total = ordered.length;
  const watchedTotal = ordered.filter((e) => watched.has(e.id)).length;
  const pct = total > 0 ? Math.round((watchedTotal / total) * 100) : 0;
  const complete = total > 0 && watchedTotal >= total;

  function doMark(ids: string[]) {
    if (ids.length === 0) return;
    setWatched((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    startTransition(() => void markEpisodesWatched(showId, ids));
  }

  function doUnmark(ids: string[]) {
    if (ids.length === 0) return;
    setWatched((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    startTransition(() => void unmarkEpisodesWatched(showId, ids));
  }

  /** Episodes before `index` that aren't watched yet (using the current set). */
  function earlierUnwatched(index: number): string[] {
    return ordered
      .slice(0, index)
      .filter((e) => !watched.has(e.id))
      .map((e) => e.id);
  }

  function toggleEpisode(ep: Ep) {
    if (watched.has(ep.id)) {
      doUnmark([ep.id]);
      return;
    }
    doMark([ep.id]);
    const earlier = earlierUnwatched(indexOf.get(ep.id) ?? 0);
    if (earlier.length > 0)
      setPrompt({ ids: earlier, label: epCode(ep.season_number, ep.episode_number) });
  }

  function toggleSeason(season: Season) {
    const ids = season.episodes.map((e) => e.id);
    const allOn = ids.length > 0 && ids.every((id) => watched.has(id));
    if (allOn) {
      doUnmark(ids);
      return;
    }
    doMark(ids);
    const firstId = season.episodes[0]?.id;
    const earlier = firstId ? earlierUnwatched(indexOf.get(firstId) ?? 0) : [];
    if (earlier.length > 0)
      setPrompt({ ids: earlier, label: season.name ?? `Season ${season.season_number}` });
  }

  function confirmEarlier() {
    if (prompt) doMark(prompt.ids);
    setPrompt(null);
  }

  return (
    <section className="mt-7 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Seasons
        </h2>
        {authed && !complete && (
          <button
            onClick={() => doMark(ordered.map((e) => e.id))}
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
          const ids = season.episodes.map((e) => e.id);
          const sWatched = ids.filter((id) => watched.has(id)).length;
          const sOn = ids.length > 0 && sWatched >= ids.length;
          return (
            <details
              key={season.season_number}
              open={i === seasons.length - 1}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-3">
                {authed ? (
                  <Tick
                    on={sOn}
                    label={sOn ? `Unmark ${season.name ?? "season"}` : `Mark ${season.name ?? "season"} watched`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSeason(season);
                    }}
                  />
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                <span className="flex-1 font-display font-medium">
                  {season.name ?? `Season ${season.season_number}`}
                </span>
                <span className="tabular font-mono text-xs text-muted-foreground">
                  {authed ? `${sWatched}/${ids.length}` : `${ids.length} eps`}
                </span>
              </summary>
              <ul className="divide-y border-t">
                {season.episodes.map((ep) => {
                  const isWatched = watched.has(ep.id);
                  return (
                    <li key={ep.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                      {authed ? (
                        <Tick
                          on={isWatched}
                          label={isWatched ? "Mark unwatched" : "Mark watched"}
                          onClick={() => toggleEpisode(ep)}
                        />
                      ) : (
                        <span className="w-6 shrink-0" />
                      )}
                      <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                        {epCode(ep.season_number, ep.episode_number)}
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

      {/* "Catch up earlier episodes?" prompt */}
      {prompt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setPrompt(null)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3 p-5">
              <h3 className="font-display text-lg font-semibold">Catch up to here?</h3>
              <p className="text-sm text-muted-foreground">
                You marked <span className="text-foreground">{prompt.label}</span>, but{" "}
                <span className="text-foreground">{prompt.ids.length}</span> earlier{" "}
                {prompt.ids.length === 1 ? "episode is" : "episodes are"} still unwatched.
                Mark {prompt.ids.length === 1 ? "it" : "them all"} watched too?
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmEarlier}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Mark all earlier watched
                </button>
                <button
                  onClick={() => setPrompt(null)}
                  className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  Just this
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
