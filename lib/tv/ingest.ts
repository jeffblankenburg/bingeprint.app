import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "./provider";
import type {
  ProviderShowSummary,
  ProviderShowDetail,
  ProviderPerson,
} from "./provider";
import type { TablesInsert } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createAdminClient>;

/** Re-fetch a show's full details from the provider if the cache is older than this. */
const DETAIL_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

/**
 * Upsert a lightweight show record from a search/summary result, so search
 * results are cached and immediately linkable without a full import.
 * Returns the local show id.
 */
export async function cacheShowSummary(
  summary: ProviderShowSummary,
  admin: Admin = createAdminClient(),
): Promise<string> {
  const { data, error } = await admin
    .from("shows")
    .upsert(
      {
        tmdb_id: Number(summary.providerId),
        name: summary.name,
        original_name: summary.originalName ?? null,
        overview: summary.overview,
        first_air_date: summary.firstAirDate,
        poster_path: summary.posterPath,
        backdrop_path: summary.backdropPath,
        popularity: summary.popularity,
        vote_average: summary.voteAverage,
        synced_at: new Date().toISOString(),
      } satisfies TablesInsert<"shows">,
      { onConflict: "tmdb_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Full import of a show: detail + every season's episodes + credits + genres +
 * networks + images + watch providers. Idempotent — safe to re-run; existing
 * rows are updated in place. Returns the local show id.
 *
 * If the show was fully synced recently and `force` is false, this is a no-op
 * that just returns the cached id.
 */
export async function importShow(
  providerId: string,
  opts: { force?: boolean; region?: string } = {},
): Promise<string> {
  const admin = createAdminClient();

  // Skip if a fresh full import already exists.
  if (!opts.force) {
    const { data: existing } = await admin
      .from("shows")
      .select("id, details_synced_at")
      .eq("tmdb_id", Number(providerId))
      .maybeSingle();
    if (
      existing?.details_synced_at &&
      Date.now() - new Date(existing.details_synced_at).getTime() < DETAIL_TTL_MS
    ) {
      return existing.id;
    }
  }

  const provider = getProvider();
  const detail = await provider.getShow(providerId);

  const showId = await upsertShowDetail(admin, detail);
  await Promise.all([
    linkGenres(admin, showId, detail),
    linkNetworks(admin, showId, detail),
    linkCredits(admin, showId, detail),
    replaceImages(admin, showId, detail),
  ]);

  const seasonIdByNumber = await upsertSeasons(admin, showId, detail);
  await importAllEpisodes(admin, showId, providerId, detail, seasonIdByNumber);
  await importWatchProviders(admin, showId, providerId, opts.region ?? "US");

  await admin
    .from("shows")
    .update({ details_synced_at: new Date().toISOString() })
    .eq("id", showId);

  return showId;
}

// ── Show detail row ─────────────────────────────────────────────────────────
async function upsertShowDetail(admin: Admin, d: ProviderShowDetail): Promise<string> {
  const { data, error } = await admin
    .from("shows")
    .upsert(
      {
        tmdb_id: Number(d.providerId),
        imdb_id: d.imdbId,
        tvdb_id: d.tvdbId,
        name: d.name,
        original_name: d.originalName ?? null,
        overview: d.overview,
        tagline: d.tagline,
        first_air_date: d.firstAirDate,
        last_air_date: d.lastAirDate,
        status: d.status,
        in_production: d.inProduction,
        show_type: d.showType,
        original_language: d.originalLanguage,
        homepage: d.homepage,
        poster_path: d.posterPath,
        backdrop_path: d.backdropPath,
        popularity: d.popularity,
        vote_average: d.voteAverage,
        vote_count: d.voteCount,
        number_of_seasons: d.numberOfSeasons,
        number_of_episodes: d.numberOfEpisodes,
        episode_run_time: d.episodeRunTime,
        adult: d.adult,
        synced_at: new Date().toISOString(),
      } satisfies TablesInsert<"shows">,
      { onConflict: "tmdb_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// ── Genres ──────────────────────────────────────────────────────────────────
async function linkGenres(admin: Admin, showId: string, d: ProviderShowDetail) {
  if (d.genres.length === 0) return;
  const { data: genres, error } = await admin
    .from("genres")
    .upsert(
      d.genres.map((g) => ({ tmdb_id: Number(g.providerId), name: g.name })),
      { onConflict: "tmdb_id" },
    )
    .select("id, tmdb_id");
  if (error) throw error;

  await admin.from("show_genres").delete().eq("show_id", showId);
  await admin.from("show_genres").insert(
    genres.map((g) => ({ show_id: showId, genre_id: g.id })),
  );
}

// ── Networks ────────────────────────────────────────────────────────────────
async function linkNetworks(admin: Admin, showId: string, d: ProviderShowDetail) {
  if (d.networks.length === 0) return;
  const { data: networks, error } = await admin
    .from("networks")
    .upsert(
      d.networks.map((n) => ({
        tmdb_id: Number(n.providerId),
        name: n.name,
        logo_path: n.logoPath,
        origin_country: n.originCountry,
      })),
      { onConflict: "tmdb_id" },
    )
    .select("id, tmdb_id");
  if (error) throw error;

  await admin.from("show_networks").delete().eq("show_id", showId);
  await admin.from("show_networks").insert(
    networks.map((n) => ({ show_id: showId, network_id: n.id })),
  );
}

// ── Credits (creators + top cast) ───────────────────────────────────────────
async function linkCredits(admin: Admin, showId: string, d: ProviderShowDetail) {
  const people = dedupePeople([...d.createdBy, ...d.cast.map((c) => c.person)]);
  if (people.length === 0) return;

  const { data: rows, error } = await admin
    .from("people")
    .upsert(
      people.map((p) => ({
        tmdb_id: Number(p.providerId),
        name: p.name,
        profile_path: p.profilePath,
        known_for_department: p.department,
        popularity: p.popularity ?? null,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "tmdb_id" },
    )
    .select("id, tmdb_id");
  if (error) throw error;

  const idByTmdb = new Map(rows.map((r) => [r.tmdb_id, r.id]));

  const credits: TablesInsert<"credits">[] = [];
  for (const creator of d.createdBy) {
    const pid = idByTmdb.get(Number(creator.providerId));
    if (pid) credits.push({ show_id: showId, person_id: pid, role: "creator" });
  }
  for (const c of d.cast) {
    const pid = idByTmdb.get(Number(c.person.providerId));
    if (pid)
      credits.push({
        show_id: showId,
        person_id: pid,
        role: "cast",
        character: c.character,
        order: c.order,
      });
  }

  await admin.from("credits").delete().eq("show_id", showId);
  if (credits.length) await admin.from("credits").insert(credits);
}

// ── Images ──────────────────────────────────────────────────────────────────
async function replaceImages(admin: Admin, showId: string, d: ProviderShowDetail) {
  await admin.from("images").delete().eq("show_id", showId);
  if (d.images.length === 0) return;
  await admin.from("images").insert(
    d.images.map((i) => ({
      show_id: showId,
      image_type: i.type,
      file_path: i.filePath,
      width: i.width,
      height: i.height,
      aspect_ratio: i.aspectRatio,
      vote_average: i.voteAverage,
    })),
  );
}

// ── Seasons ─────────────────────────────────────────────────────────────────
async function upsertSeasons(
  admin: Admin,
  showId: string,
  d: ProviderShowDetail,
): Promise<Map<number, string>> {
  if (d.seasons.length === 0) return new Map();
  const { data: rows, error } = await admin
    .from("seasons")
    .upsert(
      d.seasons.map((s) => ({
        tmdb_id: Number(s.providerId),
        show_id: showId,
        season_number: s.seasonNumber,
        name: s.name,
        overview: s.overview,
        air_date: s.airDate,
        poster_path: s.posterPath,
        episode_count: s.episodeCount,
      })),
      { onConflict: "show_id,season_number" },
    )
    .select("id, season_number");
  if (error) throw error;
  return new Map(rows.map((r) => [r.season_number, r.id]));
}

// ── Episodes (one provider call per season, limited concurrency) ─────────────
async function importAllEpisodes(
  admin: Admin,
  showId: string,
  providerId: string,
  d: ProviderShowDetail,
  seasonIdByNumber: Map<number, string>,
) {
  const provider = getProvider();
  const seasonNumbers = d.seasons.map((s) => s.seasonNumber);

  await mapWithConcurrency(seasonNumbers, 5, async (seasonNumber) => {
    const episodes = await provider.getSeasonEpisodes(providerId, seasonNumber);
    if (episodes.length === 0) return;
    const seasonId = seasonIdByNumber.get(seasonNumber) ?? null;
    const rows: TablesInsert<"episodes">[] = episodes.map((e) => ({
      tmdb_id: e.providerId ? Number(e.providerId) : null,
      show_id: showId,
      season_id: seasonId,
      season_number: e.seasonNumber,
      episode_number: e.episodeNumber,
      name: e.name,
      overview: e.overview,
      air_date: e.airDate,
      runtime: e.runtime,
      still_path: e.stillPath,
      vote_average: e.voteAverage,
      vote_count: e.voteCount,
    }));
    const { error } = await admin
      .from("episodes")
      .upsert(rows, { onConflict: "show_id,season_number,episode_number" });
    if (error) throw error;
  });
}

// ── Watch providers ─────────────────────────────────────────────────────────
async function importWatchProviders(
  admin: Admin,
  showId: string,
  providerId: string,
  region: string,
) {
  const provider = getProvider();
  const offers = await provider.getWatchProviders(providerId, region).catch(() => []);
  if (offers.length === 0) return;

  const { data: services, error } = await admin
    .from("streaming_services")
    .upsert(
      dedupeBy(offers, (o) => o.providerId).map((o) => ({
        tmdb_id: Number(o.providerId),
        name: o.name,
        logo_path: o.logoPath,
      })),
      { onConflict: "tmdb_id" },
    )
    .select("id, tmdb_id");
  if (error) throw error;

  const idByTmdb = new Map(services.map((s) => [s.tmdb_id, s.id]));
  await admin
    .from("show_streaming")
    .delete()
    .eq("show_id", showId)
    .eq("region", region);
  await admin.from("show_streaming").insert(
    offers
      .map((o) => {
        const sid = idByTmdb.get(Number(o.providerId));
        return sid
          ? { show_id: showId, service_id: sid, region, offer_type: o.offerType }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function dedupePeople(people: ProviderPerson[]): ProviderPerson[] {
  return dedupeBy(people, (p) => p.providerId);
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) break;
      await fn(item);
    }
  });
  await Promise.all(workers);
}
