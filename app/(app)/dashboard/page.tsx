import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search as SearchIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getContinueWatching } from "@/lib/tracking/queries";
import { PerfectForYou } from "@/components/recommendations/perfect-for-you";
import { SmpteBars } from "@/components/brand/smpte-bars";
import type { ShowStatus } from "@/lib/analytics/events";

function RecsSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-40 shrink-0">
          <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-secondary" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

function epCode(s: number, e: number) {
  return `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}`;
}

export const metadata: Metadata = { title: "Home" };

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

type Row = {
  status: ShowStatus;
  added_at: string;
  shows: {
    id: string;
    tmdb_id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string | null;
    number_of_episodes: number | null;
  } | null;
};

function PosterCard({ show }: { show: NonNullable<Row["shows"]> }) {
  return (
    <Link href={`/show/${show.tmdb_id}`} className="w-[104px] shrink-0">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
        {show.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${TMDB_IMAGE}/w185${show.poster_path}`}
            alt={show.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <SmpteBars height="100%" />
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium leading-tight">{show.name}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const { user, profile, supabase } = await requireUser();
  const name =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "there";

  const { data } = await supabase
    .from("user_shows")
    .select(
      "status, added_at, shows(id, tmdb_id, name, poster_path, first_air_date, number_of_episodes)",
    )
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  const rows = ((data ?? []) as Row[]).filter((r) => r.shows);
  const counts = rows.reduce(
    (acc, r) => {
      acc.total++;
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  const continueWatching = await getContinueWatching(supabase, user.id);
  const recent = rows.slice(0, 12);

  const stats = [
    { label: "In library", value: counts.total ?? 0 },
    { label: "Watching", value: counts.watching ?? 0 },
    { label: "Watched", value: counts.watched ?? 0 },
    { label: "Want to Watch", value: counts.want_to_watch ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          On now
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome, {name}.
        </h1>
      </div>

      {/* Search entry point */}
      <Link
        href="/search"
        className="flex items-center gap-2 rounded-md border border-input bg-card px-4 py-3 text-muted-foreground transition-colors hover:border-ring"
      >
        <SearchIcon className="size-5" />
        <span className="text-sm">Search shows, actors, creators…</span>
      </Link>

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your Bingeprint starts here. Find a show you&rsquo;ve watched and
              add it — the more you track, the smarter it gets.
            </p>
            <Link
              href="/search"
              className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Find your first show
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Quick stats */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <p className="tabular font-mono text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Perfect For You — recommendations (generated on first view) */}
          <Suspense fallback={<RecsSkeleton />}>
            <PerfectForYou userId={user.id} />
          </Suspense>

          {/* Continue watching — next unwatched episode per in-progress show */}
          {continueWatching.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Continue Watching</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {continueWatching.map((item) => (
                  <Link
                    key={item.show.id}
                    href={`/show/${item.show.tmdb_id}`}
                    className="w-[136px] shrink-0"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
                      {item.show.poster_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${TMDB_IMAGE}/w185${item.show.poster_path}`}
                          alt={item.show.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <SmpteBars height="100%" />
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs font-medium">
                      {item.show.name}
                    </p>
                    {item.caughtUp ? (
                      <p className="font-mono text-[11px] text-muted-foreground">Caught up</p>
                    ) : item.next ? (
                      <p className="truncate font-mono text-[11px] text-primary">
                        {epCode(item.next.season_number, item.next.episode_number)}
                        {item.next.name ? ` · ${item.next.name}` : ""}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recently added */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Recently Added</h2>
              <Link href="/library" className="text-xs text-muted-foreground hover:text-foreground">
                View library →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recent.map((r) => (
                <PosterCard key={r.shows!.id} show={r.shows!} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
