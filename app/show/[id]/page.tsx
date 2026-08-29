import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getShowCore, getShowEpisodes } from "@/lib/tv/read";
import { createClient } from "@/lib/supabase/server";
import { AddToLibrary } from "@/components/library/add-to-library";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { LazyImage } from "@/components/ui/lazy-image";
import { SeasonsTracker } from "@/components/tracking/seasons-tracker";
import { AppHeader } from "@/components/app/app-header";
import { BottomTabs } from "@/components/app/nav";
import type { ShowStatus } from "@/lib/analytics/events";

const OFFER_NOTE: Record<string, string> = {
  flatrate: "Stream",
  ads: "Free with ads",
  free: "Free",
  rent: "Rent",
  buy: "Buy",
};

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
  const { show, genres, watch, cast, seasons } = core;

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
    <>
      <AppHeader />
      <main className="pb-bottom-nav relative min-h-dvh">
        {/* Backdrop — framed to the upper area so faces aren't cropped */}
        <div className="relative h-40 w-full overflow-hidden bg-secondary sm:h-64 md:h-72">
          {show.backdrop_path && (
            <LazyImage
              src={`${TMDB_IMAGE}/w1280${show.backdrop_path}`}
              alt=""
              eager
              objectPosition="50% 20%"
              className="opacity-55"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>

      {/* relative z-10: the poster is pulled up over the (positioned) backdrop,
          so the content must sit in its own stacking context above it. */}
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4">
        {/* Hero: poster + title */}
        <div className="-mt-14 flex gap-3 sm:-mt-16 sm:gap-4">
          <div className="aspect-[2/3] w-24 shrink-0 self-start overflow-hidden rounded-lg border bg-secondary shadow-xl sm:w-32">
            {show.poster_path ? (
              <LazyImage src={`${TMDB_IMAGE}/w342${show.poster_path}`} alt={show.name} eager />
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

        {genres.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <span key={g} className="rounded-full border px-2 py-0.5 text-xs">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Where to Watch — what users actually want to know */}
        {watch.length > 0 && (
          <section className="mt-5 space-y-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Where to Watch
            </h2>
            <div className="flex flex-wrap gap-2">
              {watch.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border bg-card py-1.5 pl-1.5 pr-2.5"
                >
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-secondary">
                    {p.logoPath && (
                      <LazyImage src={`${TMDB_IMAGE}/w92${p.logoPath}`} alt={p.name} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-none">{p.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {OFFER_NOTE[p.offerType] ?? p.offerType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              US availability · via JustWatch
            </p>
          </section>
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
                <Link
                  key={person.id}
                  href={`/person/${person.tmdb_id}`}
                  className="w-16 shrink-0 text-center"
                >
                  <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-secondary">
                    {person.profile_path ? (
                      <LazyImage src={`${TMDB_IMAGE}/w185${person.profile_path}`} alt={person.name} />
                    ) : (
                      <SmpteBars height="100%" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium">{person.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {role === "creator" ? "Creator" : character}
                  </p>
                </Link>
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
      {user && <BottomTabs />}
    </>
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

  // Which episodes has the signed-in user watched?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let watchedIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_episodes")
      .select("episode_id")
      .eq("user_id", user.id)
      .eq("show_id", showId);
    watchedIds = (data ?? []).map((r) => r.episode_id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const seasonsWithEpisodes = real.map((s) => ({
    season_number: s.season_number,
    name: s.name,
    episodes: (bySeason.get(s.season_number) ?? []).map((e) => ({
      id: e.id,
      season_number: e.season_number,
      episode_number: e.episode_number,
      name: e.name,
      air_date: e.air_date,
      aired: !!e.air_date && e.air_date <= today,
    })),
  }));

  return (
    <SeasonsTracker
      showId={showId}
      seasons={seasonsWithEpisodes}
      initialWatched={watchedIds}
      authed={!!user}
    />
  );
}
