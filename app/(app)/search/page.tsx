import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { getProvider } from "@/lib/tv/provider";
import { AddToLibrary } from "@/components/library/add-to-library";
import { SmpteBars } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Search" };

function year(date: string | null) {
  return date ? date.slice(0, 4) : "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const provider = getProvider();
  const results = query ? await provider.searchMulti(query) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Find something
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Search</h1>
      </div>

      <form action="/search" className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search shows, actors, creators…"
          autoFocus
          className="h-12 w-full rounded-md border border-input bg-card pl-10 pr-4 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {results && (
        <div className="space-y-6">
          {results.shows.length === 0 && results.people.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No results for <span className="text-foreground">“{query}”</span>.
            </p>
          )}

          {results.shows.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Shows
              </h2>
              <ul className="divide-y rounded-xl border bg-card">
                {results.shows.map((show) => {
                  const poster = provider.imageUrl(show.posterPath, "thumb");
                  return (
                    <li key={show.providerId} className="flex items-center gap-3 p-3">
                      <Link
                        href={`/show/${show.providerId}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="h-[68px] w-[46px] shrink-0 overflow-hidden rounded bg-secondary">
                          {poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={poster}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <SmpteBars height="100%" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {show.name}
                            {year(show.firstAirDate) && (
                              <span className="ml-2 font-mono text-xs text-muted-foreground">
                                {year(show.firstAirDate)}
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
                      <AddToLibrary tmdbId={Number(show.providerId)} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {results.people.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                People
              </h2>
              <ul className="flex flex-wrap gap-2">
                {results.people.slice(0, 12).map((p) => (
                  <li
                    key={p.providerId}
                    className="rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {!results && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Search across {`>`}230,000 shows. Add anything to your library.
        </p>
      )}
    </div>
  );
}
