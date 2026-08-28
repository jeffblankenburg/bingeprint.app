import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShowDetail } from "@/lib/tv/read";
import { createClient } from "@/lib/supabase/server";
import { AddToLibrary } from "@/components/library/add-to-library";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { Logo } from "@/components/brand/logo";
import type { ShowStatus } from "@/lib/analytics/events";

const TMDB_IMAGE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getShowDetail(Number(id));
  if (!detail) return { title: "Show not found" };
  return {
    title: detail.show.name,
    description: detail.show.overview ?? undefined,
    openGraph: {
      title: detail.show.name,
      description: detail.show.overview ?? undefined,
      images: detail.show.backdrop_path
        ? [`${TMDB_IMAGE}/w1280${detail.show.backdrop_path}`]
        : undefined,
    },
  };
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getShowDetail(Number(id));
  if (!detail) notFound();

  const { show, genres, networks, cast, seasons } = detail;

  // Is the visitor signed in, and do they already track this show?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let currentStatus: ShowStatus | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_shows")
      .select("status")
      .eq("user_id", user.id)
      .eq("show_id", show.id)
      .maybeSingle();
    currentStatus = (data?.status as ShowStatus) ?? null;
  }

  const realSeasons = seasons.filter((s) => s.season_number > 0);
  const year = show.first_air_date?.slice(0, 4);

  return (
    <main className="relative min-h-dvh pb-16">
      <SmpteBars height="6px" />

      {/* Backdrop */}
      <div className="relative h-52 w-full overflow-hidden bg-secondary sm:h-72">
        {show.backdrop_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${TMDB_IMAGE}/w1280${show.backdrop_path}`}
            alt=""
            className="h-full w-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute left-4 top-4">
          <Link href="/">
            <Logo size={22} />
          </Link>
        </div>
      </div>

      <div className="mx-auto -mt-24 w-full max-w-3xl px-4">
        <div className="flex gap-4">
          <div className="h-[180px] w-[120px] shrink-0 overflow-hidden rounded-lg border bg-secondary shadow-xl">
            {show.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${TMDB_IMAGE}/w342${show.poster_path}`}
                alt={show.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <SmpteBars height="100%" />
            )}
          </div>
          <div className="flex flex-1 flex-col justify-end gap-2 pb-1">
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              {show.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
              {year && <span>{year}</span>}
              {show.status && <span>· {show.status}</span>}
              {show.number_of_episodes && <span>· {show.number_of_episodes} eps</span>}
              {show.vote_average ? <span>· ★ {show.vote_average.toFixed(1)}</span> : null}
            </div>
            <div className="pt-1">
              {user ? (
                <AddToLibrary tmdbId={show.tmdb_id} initialStatus={currentStatus} />
              ) : (
                <Link
                  href={`/login?next=/show/${show.tmdb_id}`}
                  className="inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign in to track
                </Link>
              )}
            </div>
          </div>
        </div>

        {(genres.length > 0 || networks.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {genres.map((g) => (
              <span key={g} className="rounded-full border px-2.5 py-0.5 text-xs">
                {g}
              </span>
            ))}
            {networks.map((n) => (
              <span
                key={n.id}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              >
                {n.name}
              </span>
            ))}
          </div>
        )}

        {show.overview && (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {show.overview}
          </p>
        )}

        {cast.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cast &amp; Creators
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {cast.map(({ person, character, role }) => (
                <div key={person.id} className="w-20 shrink-0 text-center">
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-secondary">
                    {person.profile_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${TMDB_IMAGE}/w185${person.profile_path}`}
                        alt={person.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <SmpteBars height="100%" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{person.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {role === "creator" ? "Creator" : character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {realSeasons.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Seasons
            </h2>
            <div className="space-y-2">
              {realSeasons.map((season, i) => (
                <details
                  key={season.id}
                  open={i === realSeasons.length - 1}
                  className="overflow-hidden rounded-lg border bg-card"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 font-medium">
                    <span className="font-display">
                      {season.name ?? `Season ${season.season_number}`}
                    </span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {season.episodes.length} eps
                    </span>
                  </summary>
                  <ul className="divide-y border-t">
                    {season.episodes.map((ep) => (
                      <li key={ep.id} className="flex gap-3 px-4 py-2 text-sm">
                        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                          {`S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{ep.name ?? "TBA"}</span>
                          {ep.air_date && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {ep.air_date}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 text-center font-mono text-[10px] text-muted-foreground">
          Metadata from TMDB
        </p>
      </div>
    </main>
  );
}
