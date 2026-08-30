import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/tv/provider";
import type { DiscoverSort } from "@/lib/tv/provider";
import { RecommendationShelves } from "@/components/recommendations/shelves";
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

type Tab = "for-you" | "popular" | "top-rated";
const TABS: { key: Tab; label: string }[] = [
  { key: "for-you", label: "Recommendations" },
  { key: "popular", label: "Popular" },
  { key: "top-rated", label: "Top Rated" },
];

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

function tabHref(tab: Tab, genreId?: number | null) {
  if (tab === "for-you") return "/discover";
  const p = new URLSearchParams({ tab });
  if (genreId) p.set("genre", String(genreId));
  return `/discover?${p.toString()}`;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; genre?: string }>;
}) {
  const { user } = await requireUser();
  const sp = await searchParams;
  const tab: Tab =
    sp.tab === "popular" ? "popular" : sp.tab === "top-rated" ? "top-rated" : "for-you";
  const genreId = sp.genre ? Number(sp.genre) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Discover
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Discover</h1>
      </div>

      {/* Tabs */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-lg border bg-card p-0.5">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={tabHref(t.key)}
                className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {tab === "for-you" ? (
        <Suspense fallback={<RecsSkeleton />}>
          <RecommendationShelves userId={user.id} />
        </Suspense>
      ) : (
        <BrowseGrid tab={tab} genreId={genreId} />
      )}
    </div>
  );
}

async function BrowseGrid({ tab, genreId }: { tab: Tab; genreId: number | null }) {
  const sort: DiscoverSort = tab === "top-rated" ? "rating" : "popularity";
  const shows = await getProvider()
    .discoverShows({ genreId: genreId ?? undefined, sort })
    .catch(() => []);

  return (
    <div className="space-y-5">
      {/* Genre chips — horizontal scroll on mobile */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <GenreChip label="All" href={tabHref(tab, null)} active={genreId === null} />
          {GENRES.map((g) => (
            <GenreChip
              key={g.id}
              label={g.name}
              href={tabHref(tab, g.id)}
              active={g.id === genreId}
            />
          ))}
        </div>
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
                    {tab === "top-rated" && rating && (
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

function GenreChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function RecsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-40 rounded bg-secondary" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] w-40 shrink-0 rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  );
}
