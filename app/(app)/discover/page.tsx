import type { Metadata } from "next";
import Link from "next/link";
import { getProvider } from "@/lib/tv/provider";
import type { DiscoverSort } from "@/lib/tv/provider";
import { LazyImage } from "@/components/ui/lazy-image";
import { SmpteBars } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Discover" };

// TMDB TV genres worth browsing, in a sensible discovery order.
const GENRES: { id: number; name: string }[] = [
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 80, name: "Crime" },
  { id: 9648, name: "Mystery" },
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 99, name: "Documentary" },
  { id: 10751, name: "Family" },
  { id: 10764, name: "Reality" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" },
];

const SORTS: { key: DiscoverSort; label: string }[] = [
  { key: "popularity", label: "Popular" },
  { key: "rating", label: "Top Rated" },
];

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

function hrefFor(genreId: number | null, sort: DiscoverSort) {
  const p = new URLSearchParams();
  if (genreId) p.set("genre", String(genreId));
  if (sort !== "popularity") p.set("sort", sort);
  const qs = p.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const genreId = sp.genre ? Number(sp.genre) : null;
  const sort: DiscoverSort = sp.sort === "rating" ? "rating" : "popularity";
  const activeGenre = GENRES.find((g) => g.id === genreId) ?? null;

  const shows = await getProvider()
    .discoverShows({ genreId: genreId ?? undefined, sort })
    .catch(() => []);

  const heading = activeGenre ? activeGenre.name : "Everything";
  const subheading =
    sort === "rating" ? "Highest rated" : "Most popular right now";

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Discover
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Browse</h1>
      </div>

      {/* Sort toggle */}
      <div className="inline-flex rounded-lg border bg-card p-0.5">
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Link
              key={s.key}
              href={hrefFor(genreId, s.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Genre chips — horizontal scroll on mobile */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <Link
            href={hrefFor(null, sort)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
              genreId === null
                ? "border-primary bg-primary/15 text-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </Link>
          {GENRES.map((g) => {
            const active = g.id === genreId;
            return (
              <Link
                key={g.id}
                href={hrefFor(g.id, sort)}
                className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">{heading}</h2>
        <span className="font-mono text-xs text-muted-foreground">{subheading}</span>
      </div>

      {shows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing to show here right now. Try another genre.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {shows.map((s) => {
            const year = s.firstAirDate?.slice(0, 4);
            const rating = s.voteAverage ? s.voteAverage.toFixed(1) : null;
            return (
              <li key={s.providerId}>
                <Link href={`/show/${s.providerId}`} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border bg-secondary">
                    {s.posterPath ? (
                      <LazyImage src={`${TMDB_IMAGE}/w342${s.posterPath}`} alt={s.name} />
                    ) : (
                      <SmpteBars height="100%" />
                    )}
                    {sort === "rating" && rating && (
                      <span className="absolute right-1 top-1 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums backdrop-blur">
                        ★ {rating}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-tight group-hover:text-primary">
                    {s.name}
                  </p>
                  {year && (
                    <p className="font-mono text-[11px] text-muted-foreground">{year}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
