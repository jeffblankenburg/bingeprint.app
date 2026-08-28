import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getShowCore, getShowEpisodes } from "@/lib/tv/read";
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
  const core = await getShowCore(Number(id));
  if (!core) return { title: "Show not found" };
  return {
    title: core.show.name,
    description: core.show.overview ?? undefined,
    openGraph: {
      title: core.show.name,
      description: core.show.overview ?? undefined,
      images: core.show.backdrop_path
        ? [`${TMDB_IMAGE}/w1280${core.show.backdrop_path}`]
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
  const core = await getShowCore(Number(id));
  if (!core) notFound();
  const { show, genres, networks, cast, seasons } = core;

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

  const year = show.first_air_date?.slice(0, 4);

  return (
    <main className="relative min-h-dvh pb-16">
      <SmpteBars height="5px" />

      {/* Backdrop — short on mobile */}
      <div className="relative h-36 w-full overflow-hidden bg-secondary sm:h-56">
        {show.backdrop_path && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${TMDB_IMAGE}/w780${show.backdrop_path}`}
            alt=""
            className="h-full w-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <Link href="/" className="absolute left-4 top-3">
          <Logo size={20} />
        </Link>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4">
        {/* Hero: poster + title */}
        <div className="-mt-14 flex gap-3 sm:-mt-16 sm:gap-4">
          <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg border bg-secondary shadow-xl sm:w-32">
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
          <div className="flex min-w-0 flex-1 flex-col justify-end gap-1.5 pb-1">
            <h1 className="font-display text-xl font-bold leading-tight sm:text-3xl">
              {show.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground sm:text-xs">
              {year && <span>{year}</span>}
              {show.status && <span>· {show.status}</span>}
              {show.number_of_episodes ? <span>· {show.number_of_episodes} eps</span> : null}
              {show.vote_average ? <span>· ★ {show.vote_average.toFixed(1)}</span> : null}
            </div>
          </div>
        </div>

        <div className="mt-3">
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

        {(genres.length > 0 || networks.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span key={g} className="rounded-full border px-2 py-0.5 text-xs">
                {g}
              </span>
            ))}
            {networks.map((n) => (
              <span
                key={n.id}
                className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {n.name}
              </span>
            ))}
          </div>
        )}

        {show.overview && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {show.overview}
          </p>
        )}

        {cast.length > 0 && (
          <section className="mt-7 space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Cast &amp; Creators
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
              {cast.map(({ person, character, role }) => (
                <div key={person.id} className="w-16 shrink-0 text-center">
                  <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-secondary">
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
                  <p className="mt-1 truncate text-[11px] font-medium">{person.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {role === "creator" ? "Creator" : character}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Episodes stream in — the hero above never waits on them */}
        <Suspense fallback={<SeasonsSkeleton seasons={seasons} />}>
          <ShowEpisodes tmdbId={show.tmdb_id} showId={show.id} seasons={seasons} />
        </Suspense>

        <p className="mt-10 text-center font-mono text-[10px] text-muted-foreground">
          Metadata from TMDB
        </p>
      </div>
    </main>
  );
}

type Season = { id: string; season_number: number; name: string | null; episode_count: number | null };

function SeasonsSkeleton({ seasons }: { seasons: Season[] }) {
  const real = seasons.filter((s) => s.season_number > 0);
  if (real.length === 0) return null;
  return (
    <section className="mt-7 space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Seasons
      </h2>
      <div className="space-y-2">
        {real.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <span className="font-display font-medium">
              {s.name ?? `Season ${s.season_number}`}
            </span>
            <span className="animate-pulse font-mono text-xs text-muted-foreground">
              {s.episode_count ?? "…"} eps
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

async function ShowEpisodes({
  tmdbId,
  showId,
  seasons,
}: {
  tmdbId: number;
  showId: string;
  seasons: Season[];
}) {
  const bySeason = await getShowEpisodes(tmdbId, showId);
  const real = seasons.filter((s) => s.season_number > 0);
  if (real.length === 0) return null;

  return (
    <section className="mt-7 space-y-3">
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Seasons
      </h2>
      <div className="space-y-2">
        {real.map((season, i) => {
          const episodes = bySeason.get(season.season_number) ?? [];
          return (
            <details
              key={season.id}
              open={i === real.length - 1}
              className="overflow-hidden rounded-lg border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                <span className="font-display font-medium">
                  {season.name ?? `Season ${season.season_number}`}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {episodes.length} eps
                </span>
              </summary>
              <ul className="divide-y border-t">
                {episodes.map((ep) => (
                  <li key={ep.id} className="flex gap-2 px-4 py-2 text-sm">
                    <span className="w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {`S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{ep.name ?? "TBA"}</span>
                      {ep.air_date && (
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                          {ep.air_date}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
