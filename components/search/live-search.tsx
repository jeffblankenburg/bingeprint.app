"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { AddToLibrary } from "@/components/library/add-to-library";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { track } from "@/lib/analytics";

type ShowResult = {
  tmdbId: number;
  name: string;
  overview: string | null;
  year: string;
  poster: string | null;
};
type Results = { shows: ShowResult[]; people: { name: string }[] };

/** Debounced live search — results appear as you type, no Enter required. */
export function LiveSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const tracked = useRef("");

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data: Results = await res.json();
        setResults(data);
        if (tracked.current !== query) {
          track("show_searched", {
            query_length: query.length,
            result_count: data.shows.length,
          });
          tracked.current = query;
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults({ shows: [], people: [] });
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search shows, actors, creators…"
          autoFocus
          className="h-12 w-full rounded-md border border-input bg-card pl-10 pr-10 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {results && results.shows.length === 0 && !loading && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No shows for <span className="text-foreground">“{q.trim()}”</span>.
        </p>
      )}

      {results && results.shows.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {results.shows.map((show) => (
            <li key={show.tmdbId} className="flex items-center gap-3 p-3">
              <Link
                href={`/show/${show.tmdbId}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="h-[68px] w-[46px] shrink-0 overflow-hidden rounded bg-secondary">
                  {show.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={show.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <SmpteBars height="100%" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {show.name}
                    {show.year && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {show.year}
                      </span>
                    )}
                  </p>
                  {show.overview && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {show.overview}
                    </p>
                  )}
                </div>
              </Link>
              <AddToLibrary tmdbId={show.tmdbId} />
            </li>
          ))}
        </ul>
      )}

      {!results && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Start typing to search across 230,000+ shows.
        </p>
      )}
    </div>
  );
}
