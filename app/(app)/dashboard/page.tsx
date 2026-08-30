import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getContinueWatching } from "@/lib/tracking/queries";
import { SmpteBars } from "@/components/brand/smpte-bars";
import type { ShowStatus } from "@/lib/analytics/events";

export const metadata: Metadata = { title: "Home" };

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

function epCode(s: number, e: number) {
  return `S${String(s).padStart(2, "0")}E${String(e).padStart(2, "0")}`;
}

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
  const name = profile?.display_name?.trim() || user.email?.split("@")[0] || "there";

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

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          On now
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome, {name}.
        </h1>
        {rows.length > 0 && (
          <p className="font-mono text-xs text-muted-foreground">
            {counts.total} in library · {counts.watching ?? 0} watching ·{" "}
            {counts.watched ?? 0} watched ·{" "}
            <Link href="/insights" className="text-primary hover:underline">
              Insights →
            </Link>
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Your Bingeprint starts here. Search a show you&rsquo;ve watched and
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
          {/* 1 — Continue Watching (the point of the app) */}
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

          {/* 2 — Recently Added (recommendations live on /discover) */}
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
