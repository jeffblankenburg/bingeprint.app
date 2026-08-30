import "server-only";

import type {
  TVProvider,
  ProviderShowSummary,
  ProviderShowDetail,
  ProviderEpisode,
  ProviderPerson,
  ProviderWatchOffer,
  ProviderProviderInfo,
  ProviderEpisodeCredit,
  ProviderPersonDetail,
  ProviderPersonCredit,
  CreditRole,
  SearchResults,
  ImageSize,
  DiscoverOptions,
} from "./provider";

const API_BASE = process.env.TMDB_API_BASE ?? "https://api.themoviedb.org/3";
const IMAGE_BASE = process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

const IMAGE_SIZES: Record<ImageSize, string> = {
  thumb: "w92",
  poster: "w500",
  backdrop: "w1280",
  still: "w300",
  profile: "w185",
  original: "original",
};

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

/** Adapter mapping TMDB's API onto the provider-agnostic contract. */
export class TmdbProvider implements TVProvider {
  readonly name = "tmdb";
  private readonly bearer: string | null;
  private readonly apiKey: string | null;

  constructor() {
    // Prefer the v4 Read Access Token (JWT bearer). Fall back to a v3 API key
    // (32-char hex) passed as the `api_key` query param. TMDB_API_KEY may hold
    // either, so detect by shape.
    const readToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
    const apiKeyEnv = process.env.TMDB_API_KEY?.trim();
    const looksLikeBearer = (v?: string) => !!v && v.startsWith("ey");

    this.bearer = looksLikeBearer(readToken)
      ? readToken!
      : looksLikeBearer(apiKeyEnv)
        ? apiKeyEnv!
        : null;
    this.apiKey = !this.bearer && apiKeyEnv ? apiKeyEnv : null;

    if (!this.bearer && !this.apiKey) {
      throw new TmdbError(
        "No TMDB credentials — set TMDB_READ_ACCESS_TOKEN (v4 bearer) or TMDB_API_KEY (v3).",
        500,
      );
    }
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    revalidate = 60 * 60,
  ): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.bearer) headers.Authorization = `Bearer ${this.bearer}`;
    else if (this.apiKey) url.searchParams.set("api_key", this.apiKey);

    const res = await fetch(url, { headers, next: { revalidate } });
    if (!res.ok) {
      throw new TmdbError(`TMDB ${path} failed: ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  }

  imageUrl(path: string | null, size: ImageSize = "poster"): string | null {
    if (!path) return null;
    return `${IMAGE_BASE}/${IMAGE_SIZES[size]}${path}`;
  }

  async searchShows(query: string): Promise<ProviderShowSummary[]> {
    const data = await this.get<{ results: TmdbShow[] }>(
      "/search/tv",
      { query, include_adult: "false" },
      60 * 10,
    );
    return data.results.map(mapShowSummary);
  }

  async searchMulti(query: string): Promise<SearchResults> {
    const data = await this.get<{ results: TmdbMultiResult[] }>(
      "/search/multi",
      { query, include_adult: "false" },
      60 * 10,
    );
    const shows: ProviderShowSummary[] = [];
    const people: ProviderPerson[] = [];
    for (const r of data.results) {
      if (r.media_type === "tv") shows.push(mapShowSummary(r));
      else if (r.media_type === "person")
        people.push(mapPerson({ ...r, name: r.name ?? "Unknown" }));
    }
    return { shows, people };
  }

  async popularShows(page = 1): Promise<ProviderShowSummary[]> {
    const data = await this.get<{ results: TmdbShow[] }>("/tv/popular", { page });
    return data.results.map(mapShowSummary);
  }

  async discoverShows(opts: DiscoverOptions): Promise<ProviderShowSummary[]> {
    const rating = opts.sort === "rating";
    const params: Record<string, string | number> = {
      page: opts.page ?? 1,
      include_adult: "false",
      // "Top rated" without a vote floor surfaces obscure shows with a single
      // 10/10 vote — gate it so the list is trustworthy.
      sort_by: rating ? "vote_average.desc" : "popularity.desc",
      "vote_count.gte": rating ? 200 : 0,
    };
    if (opts.genreId) params.with_genres = opts.genreId;
    const data = await this.get<{ results: TmdbShow[] }>("/discover/tv", params, 60 * 60 * 6);
    return (data.results ?? []).map(mapShowSummary);
  }

  async getRecommendations(providerId: string): Promise<ProviderShowSummary[]> {
    const data = await this.get<{ results: TmdbShow[] }>(
      `/tv/${providerId}/recommendations`,
      {},
      60 * 60 * 24,
    );
    return (data.results ?? []).map(mapShowSummary);
  }

  async getShow(providerId: string): Promise<ProviderShowDetail> {
    const d = await this.get<TmdbShowDetail>(`/tv/${providerId}`, {
      append_to_response: "external_ids,aggregate_credits,images",
      include_image_language: "en,null",
    });

    const cast = (d.aggregate_credits?.cast ?? [])
      .slice(0, 20)
      .map((c) => ({
        person: mapPerson({
          id: c.id,
          name: c.name,
          profile_path: c.profile_path,
          known_for_department: c.known_for_department,
          popularity: c.popularity,
        }),
        character: c.roles?.[0]?.character ?? null,
        order: c.order ?? null,
      }));

    const images = [
      ...(d.images?.posters ?? []).slice(0, 10).map((i) => ({
        type: "poster" as const,
        filePath: i.file_path,
        width: i.width ?? null,
        height: i.height ?? null,
        aspectRatio: i.aspect_ratio ?? null,
        voteAverage: i.vote_average ?? null,
      })),
      ...(d.images?.backdrops ?? []).slice(0, 10).map((i) => ({
        type: "backdrop" as const,
        filePath: i.file_path,
        width: i.width ?? null,
        height: i.height ?? null,
        aspectRatio: i.aspect_ratio ?? null,
        voteAverage: i.vote_average ?? null,
      })),
    ];

    return {
      ...mapShowSummary(d),
      imdbId: d.external_ids?.imdb_id ?? null,
      tvdbId: d.external_ids?.tvdb_id ?? null,
      tagline: d.tagline || null,
      lastAirDate: d.last_air_date || null,
      status: d.status ?? null,
      inProduction: d.in_production ?? null,
      showType: d.type ?? null,
      originalLanguage: d.original_language ?? null,
      homepage: d.homepage || null,
      voteCount: d.vote_count ?? null,
      numberOfSeasons: d.number_of_seasons ?? null,
      numberOfEpisodes: d.number_of_episodes ?? null,
      episodeRunTime: d.episode_run_time?.[0] ?? null,
      adult: d.adult ?? false,
      genres: (d.genres ?? []).map((g) => ({ providerId: String(g.id), name: g.name })),
      networks: (d.networks ?? []).map((n) => ({
        providerId: String(n.id),
        name: n.name,
        logoPath: n.logo_path ?? null,
        originCountry: n.origin_country ?? null,
      })),
      seasons: (d.seasons ?? []).map((s) => ({
        providerId: String(s.id),
        seasonNumber: s.season_number,
        name: s.name ?? null,
        overview: s.overview || null,
        airDate: s.air_date || null,
        posterPath: s.poster_path ?? null,
        episodeCount: s.episode_count ?? null,
      })),
      createdBy: (d.created_by ?? []).map((p) =>
        mapPerson({
          id: p.id,
          name: p.name,
          profile_path: p.profile_path,
          known_for_department: "Creator",
        }),
      ),
      cast,
      images,
    };
  }

  async getSeasonEpisodes(
    showProviderId: string,
    seasonNumber: number,
  ): Promise<ProviderEpisode[]> {
    const d = await this.get<{ episodes: TmdbEpisode[] }>(
      `/tv/${showProviderId}/season/${seasonNumber}`,
    );
    return (d.episodes ?? []).map((e) => ({
      providerId: String(e.id),
      seasonNumber: e.season_number,
      episodeNumber: e.episode_number,
      name: e.name ?? null,
      overview: e.overview || null,
      airDate: e.air_date || null,
      runtime: e.runtime ?? null,
      stillPath: e.still_path ?? null,
      voteAverage: e.vote_average ?? null,
      voteCount: e.vote_count ?? null,
    }));
  }

  async getWatchProviderList(region = "US"): Promise<ProviderProviderInfo[]> {
    const d = await this.get<{ results: TmdbProviderInfo[] }>(
      "/watch/providers/tv",
      { watch_region: region },
      60 * 60 * 24,
    );
    return (d.results ?? []).map((p) => ({
      providerId: String(p.provider_id),
      name: p.provider_name,
      logoPath: p.logo_path ?? null,
      displayPriority: p.display_priorities?.[region] ?? p.display_priority ?? 999,
    }));
  }

  async getWatchProviders(
    providerId: string,
    region = "US",
  ): Promise<ProviderWatchOffer[]> {
    const d = await this.get<{ results: Record<string, TmdbWatchRegion> }>(
      `/tv/${providerId}/watch/providers`,
    );
    const r = d.results?.[region];
    if (!r) return [];
    const offers: ProviderWatchOffer[] = [];
    const kinds: Array<["flatrate" | "rent" | "buy" | "ads" | "free", TmdbProviderOffer[] | undefined]> = [
      ["flatrate", r.flatrate],
      ["ads", r.ads],
      ["free", r.free],
      ["rent", r.rent],
      ["buy", r.buy],
    ];
    for (const [offerType, list] of kinds) {
      for (const p of list ?? []) {
        offers.push({
          providerId: String(p.provider_id),
          name: p.provider_name,
          logoPath: p.logo_path ?? null,
          offerType,
        });
      }
    }
    return offers;
  }

  async getEpisodeCredits(
    showProviderId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<ProviderEpisodeCredit[]> {
    const d = await this.get<TmdbEpisodeCredits>(
      `/tv/${showProviderId}/season/${seasonNumber}/episode/${episodeNumber}/credits`,
    );
    const out: ProviderEpisodeCredit[] = [];
    for (const c of d.cast ?? [])
      out.push({ person: mapPerson(c), role: "cast", character: c.character ?? null, order: c.order ?? null, source: "cast" });
    for (const g of d.guest_stars ?? [])
      out.push({ person: mapPerson(g), role: "cast", character: g.character ?? null, order: g.order ?? null, source: "guest" });
    for (const cr of d.crew ?? []) {
      const role = crewRole(cr.job);
      if (!role) continue;
      out.push({ person: mapPerson(cr), role, character: null, order: null, source: "crew" });
    }
    return out;
  }

  async getPerson(providerId: string): Promise<ProviderPersonDetail | null> {
    try {
      const d = await this.get<TmdbPersonDetail>(`/person/${providerId}`, {
        append_to_response: "tv_credits",
      });
      const credits: ProviderPersonCredit[] = [];
      for (const c of d.tv_credits?.cast ?? [])
        credits.push({ show: mapShowSummary(c), character: c.character ?? null, role: "cast", episodeCount: c.episode_count ?? null });
      for (const c of d.tv_credits?.crew ?? [])
        if (c.job === "Creator")
          credits.push({ show: mapShowSummary(c), character: "Creator", role: "creator", episodeCount: c.episode_count ?? null });

      // One row per show, preferring the credit with the most episodes.
      const byShow = new Map<string, ProviderPersonCredit>();
      for (const c of credits) {
        const ex = byShow.get(c.show.providerId);
        if (!ex || (c.episodeCount ?? 0) > (ex.episodeCount ?? 0)) byShow.set(c.show.providerId, c);
      }
      const list = [...byShow.values()].sort(
        (a, b) =>
          (b.episodeCount ?? 0) - (a.episodeCount ?? 0) ||
          (b.show.popularity ?? 0) - (a.show.popularity ?? 0),
      );

      return {
        ...mapPerson(d),
        biography: d.biography || null,
        birthday: d.birthday || null,
        credits: list,
      };
    } catch (err) {
      if (err instanceof TmdbError && err.status === 404) return null;
      throw err;
    }
  }
}

/** Map a TMDB crew job to our credit role (only the roles we care about). */
function crewRole(job?: string): CreditRole | null {
  if (!job) return null;
  if (job === "Director") return "director";
  if (["Writer", "Screenplay", "Teleplay", "Story"].includes(job)) return "writer";
  return null;
}

// ── Raw TMDB → provider domain mappers ──────────────────────────────────────
function mapShowSummary(s: TmdbShow): ProviderShowSummary {
  return {
    providerId: String(s.id),
    name: s.name ?? s.original_name ?? "Untitled",
    originalName: s.original_name ?? null,
    overview: s.overview || null,
    firstAirDate: s.first_air_date || null,
    posterPath: s.poster_path ?? null,
    backdropPath: s.backdrop_path ?? null,
    popularity: s.popularity ?? null,
    voteAverage: s.vote_average ?? null,
  };
}

function mapPerson(p: TmdbPersonLike): ProviderPerson {
  return {
    providerId: String(p.id),
    name: p.name,
    profilePath: p.profile_path ?? null,
    department: p.known_for_department ?? null,
    popularity: p.popularity ?? null,
  };
}

// ── Minimal raw TMDB response shapes (only the fields we consume) ────────────
interface TmdbShow {
  id: number;
  name?: string;
  original_name?: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_average?: number;
}
interface TmdbMultiResult {
  id: number;
  media_type: "tv" | "movie" | "person";
  name?: string;
  original_name?: string;
  overview?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  vote_average?: number;
  profile_path?: string | null;
  known_for_department?: string | null;
}
interface TmdbPersonLike {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string | null;
  popularity?: number;
}
interface TmdbShowDetail extends TmdbShow {
  tagline?: string;
  last_air_date?: string;
  status?: string;
  in_production?: boolean;
  type?: string;
  original_language?: string;
  homepage?: string;
  vote_count?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  adult?: boolean;
  genres?: Array<{ id: number; name: string }>;
  networks?: Array<{ id: number; name: string; logo_path?: string | null; origin_country?: string }>;
  seasons?: Array<{
    id: number;
    season_number: number;
    name?: string;
    overview?: string;
    air_date?: string;
    poster_path?: string | null;
    episode_count?: number;
  }>;
  created_by?: Array<{ id: number; name: string; profile_path?: string | null }>;
  external_ids?: { imdb_id?: string | null; tvdb_id?: number | null };
  aggregate_credits?: {
    cast?: Array<{
      id: number;
      name: string;
      profile_path?: string | null;
      known_for_department?: string | null;
      popularity?: number;
      order?: number;
      roles?: Array<{ character?: string }>;
    }>;
  };
  images?: {
    posters?: TmdbImage[];
    backdrops?: TmdbImage[];
  };
}
interface TmdbImage {
  file_path: string;
  width?: number;
  height?: number;
  aspect_ratio?: number;
  vote_average?: number;
}
interface TmdbEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number;
  vote_count?: number;
}
interface TmdbProviderOffer {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}
interface TmdbProviderInfo {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number;
  display_priorities?: Record<string, number>;
}
interface TmdbEpisodeCastLike extends TmdbPersonLike {
  character?: string;
  order?: number;
}
interface TmdbEpisodeCredits {
  cast?: TmdbEpisodeCastLike[];
  guest_stars?: TmdbEpisodeCastLike[];
  crew?: (TmdbPersonLike & { job?: string; department?: string })[];
}
interface TmdbPersonDetail extends TmdbPersonLike {
  biography?: string;
  birthday?: string;
  tv_credits?: {
    cast?: (TmdbShow & { character?: string; episode_count?: number })[];
    crew?: (TmdbShow & { job?: string; department?: string; episode_count?: number })[];
  };
}
interface TmdbWatchRegion {
  flatrate?: TmdbProviderOffer[];
  rent?: TmdbProviderOffer[];
  buy?: TmdbProviderOffer[];
  ads?: TmdbProviderOffer[];
  free?: TmdbProviderOffer[];
}
