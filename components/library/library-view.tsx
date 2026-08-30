"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { LibraryControls } from "@/components/library/library-controls";
import { SmpteBars } from "@/components/brand/smpte-bars";
import type { ShowStatus } from "@/lib/analytics/events";

const TMDB_IMAGE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export type LibraryItem = {
  id: string;
  tmdb_id: number;
  name: string;
  poster_path: string | null;
  year: string | null;
  episodes: number | null;
  status: ShowStatus;
  added_at: string;
  last_air: string | null;
};

const STATUS_ORDER: ShowStatus[] = [
  "watching",
  "want_to_watch",
  "watched",
  "paused",
  "abandoned",
];
const STATUS_LABELS: Record<ShowStatus, string> = {
  watching: "Watching",
  want_to_watch: "Want to Watch",
  watched: "Watched",
  paused: "Paused",
  abandoned: "Abandoned",
};

type SortKey = "added" | "title" | "aired" | "episodes";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "added", label: "Recently added" },
  { key: "title", label: "Title A–Z" },
  { key: "aired", label: "Recently aired" },
  { key: "episodes", label: "Most episodes" },
];

export function LibraryView({ items }: { items: LibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("added");
  const [statusFilter, setStatusFilter] = useState<ShowStatus | "all">("all");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter(
      (i) =>
        (statusFilter === "all" || i.status === statusFilter) &&
        (q === "" || i.name.toLowerCase().includes(q)),
    );
    const cmp: Record<SortKey, (a: LibraryItem, b: LibraryItem) => number> = {
      added: (a, b) => b.added_at.localeCompare(a.added_at),
      title: (a, b) => a.name.localeCompare(b.name),
      aired: (a, b) => (b.last_air ?? "").localeCompare(a.last_air ?? ""),
      episodes: (a, b) => (b.episodes ?? 0) - (a.episodes ?? 0),
    };
    return [...filtered].sort(cmp[sort]);
  }, [items, query, sort, statusFilter]);

  const byStatus = useMemo(() => {
    const m = new Map<ShowStatus, LibraryItem[]>();
    for (const i of sorted) {
      const list = m.get(i.status) ?? [];
      list.push(i);
      m.set(i.status, list);
    }
    return m;
  }, [sorted]);

  const statusCounts = useMemo(() => {
    const m = new Map<ShowStatus, number>();
    for (const i of items) m.set(i.status, (m.get(i.status) ?? 0) + 1);
    return m;
  }, [items]);

  const chips: (ShowStatus | "all")[] = [
    "all",
    ...STATUS_ORDER.filter((s) => statusCounts.has(s)),
  ];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Filter your shows…"
              className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status chips */}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {chips.map((c) => {
              const active = c === statusFilter;
              const label = c === "all" ? "All" : STATUS_LABELS[c];
              const count = c === "all" ? items.length : statusCounts.get(c) ?? 0;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStatusFilter(c)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No shows match{query.trim() ? ` “${query.trim()}”` : ""}.
        </p>
      ) : (
        STATUS_ORDER.filter((s) => byStatus.has(s)).map((statusKey) => (
          <section key={statusKey} className="space-y-3">
            <h2 className="font-display text-lg font-semibold">
              {STATUS_LABELS[statusKey]}
              <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
                {byStatus.get(statusKey)!.length}
              </span>
            </h2>
            <ul className="divide-y rounded-xl border bg-card">
              {byStatus.get(statusKey)!.map((show) => (
                <li key={show.id} className="flex items-start gap-3 p-3">
                  <Link href={`/show/${show.tmdb_id}`} className="shrink-0" aria-label={show.name}>
                    <div className="h-[68px] w-[46px] overflow-hidden rounded bg-secondary">
                      {show.poster_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${TMDB_IMAGE}/w92${show.poster_path}`}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <SmpteBars height="100%" />
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/show/${show.tmdb_id}`}>
                      <p className="line-clamp-2 font-medium leading-tight">{show.name}</p>
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {show.year ?? "—"}
                      {show.episodes ? ` · ${show.episodes} eps` : ""}
                    </p>
                    <div className="mt-2">
                      <LibraryControls showId={show.id} status={statusKey} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
