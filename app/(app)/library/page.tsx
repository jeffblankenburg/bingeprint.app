import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LibraryControls } from "@/components/library/library-controls";
import { SmpteBars } from "@/components/brand/smpte-bars";
import type { ShowStatus } from "@/lib/analytics/events";

export const metadata: Metadata = { title: "Library" };

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

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

type Row = {
  status: ShowStatus;
  shows: {
    id: string;
    tmdb_id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string | null;
    number_of_episodes: number | null;
  } | null;
};

export default async function LibraryPage() {
  const { user, supabase } = await requireUser();

  const { data } = await supabase
    .from("user_shows")
    .select(
      "status, added_at, shows(id, tmdb_id, name, poster_path, first_air_date, number_of_episodes)",
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const rows = (data ?? []) as Row[];
  const byStatus = new Map<ShowStatus, Row[]>();
  for (const r of rows) {
    if (!r.shows) continue;
    const list = byStatus.get(r.status) ?? [];
    list.push(r);
    byStatus.set(r.status, list);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Your shows
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Library</h1>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "show" : "shows"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your library is empty. Find a show and add it.
            </p>
            <Link
              href="/search"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Search shows
            </Link>
          </div>
        </div>
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
              {byStatus.get(statusKey)!.map(({ shows: show }) => (
                <li key={show!.id} className="flex items-center gap-3 p-3">
                  <Link
                    href={`/show/${show!.tmdb_id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="h-[68px] w-[46px] shrink-0 overflow-hidden rounded bg-secondary">
                      {show!.poster_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${TMDB_IMAGE}/w92${show!.poster_path}`}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <SmpteBars height="100%" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{show!.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {show!.first_air_date?.slice(0, 4) ?? "—"}
                        {show!.number_of_episodes
                          ? ` · ${show!.number_of_episodes} eps`
                          : ""}
                      </p>
                    </div>
                  </Link>
                  <LibraryControls showId={show!.id} status={statusKey} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
