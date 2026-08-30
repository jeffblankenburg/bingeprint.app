/**
 * Provider-agnostic television data contract.
 *
 * The rest of the app depends on these normalized shapes and the `TVProvider`
 * interface — never on TMDB (or, later, TheTVDB) response formats. Swapping or
 * adding a metadata provider means writing a new adapter that returns these
 * types; nothing downstream changes. External provider IDs are always retained.
 */

export interface ProviderRef {
  providerId: string; // stable external id (e.g. TMDB id as string)
}

export interface ProviderPerson extends ProviderRef {
  name: string;
  profilePath: string | null;
  department: string | null;
  imdbId?: string | null;
  popularity?: number | null;
}

export interface ProviderShowSummary extends ProviderRef {
  name: string;
  overview: string | null;
  firstAirDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  popularity: number | null;
  voteAverage: number | null;
  originalName?: string | null;
}

export interface ProviderSeason extends ProviderRef {
  seasonNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  posterPath: string | null;
  episodeCount: number | null;
}

export interface ProviderEpisode extends ProviderRef {
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
  voteAverage: number | null;
  voteCount: number | null;
}

export interface ProviderCastMember {
  person: ProviderPerson;
  character: string | null;
  order: number | null;
}

export interface ProviderImage {
  type: "poster" | "backdrop";
  filePath: string;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  voteAverage: number | null;
}

export interface ProviderNetwork extends ProviderRef {
  name: string;
  logoPath: string | null;
  originCountry: string | null;
}

export interface ProviderShowDetail extends ProviderShowSummary {
  imdbId: string | null;
  tvdbId: number | null;
  tagline: string | null;
  lastAirDate: string | null;
  status: string | null;
  inProduction: boolean | null;
  showType: string | null;
  originalLanguage: string | null;
  homepage: string | null;
  voteCount: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  episodeRunTime: number | null;
  adult: boolean;
  genres: Array<ProviderRef & { name: string }>;
  networks: ProviderNetwork[];
  seasons: ProviderSeason[];
  createdBy: ProviderPerson[];
  cast: ProviderCastMember[];
  images: ProviderImage[];
}

export interface ProviderWatchOffer extends ProviderRef {
  name: string;
  logoPath: string | null;
  offerType: "flatrate" | "rent" | "buy" | "ads" | "free";
}

export interface ProviderProviderInfo extends ProviderRef {
  name: string;
  logoPath: string | null;
  displayPriority: number;
}

export type CreditRole = "cast" | "creator" | "director" | "writer" | "producer";

export interface ProviderEpisodeCredit {
  person: ProviderPerson;
  role: CreditRole;
  character: string | null;
  order: number | null;
  source: "cast" | "guest" | "crew";
}

export interface ProviderPersonCredit {
  show: ProviderShowSummary;
  character: string | null;
  role: "cast" | "creator";
  episodeCount: number | null;
}

export interface ProviderPersonDetail extends ProviderPerson {
  biography: string | null;
  birthday: string | null;
  credits: ProviderPersonCredit[];
}

export interface SearchResults {
  shows: ProviderShowSummary[];
  people: ProviderPerson[];
}

export type ImageSize = "thumb" | "poster" | "backdrop" | "still" | "profile" | "original";

export interface TVProvider {
  readonly name: string;
  searchShows(query: string): Promise<ProviderShowSummary[]>;
  searchMulti(query: string): Promise<SearchResults>;
  getShow(providerId: string): Promise<ProviderShowDetail>;
  getSeasonEpisodes(showProviderId: string, seasonNumber: number): Promise<ProviderEpisode[]>;
  getWatchProviders(providerId: string, region?: string): Promise<ProviderWatchOffer[]>;
  /** The full list of watch providers available in a region (for the picker). */
  getWatchProviderList(region?: string): Promise<ProviderProviderInfo[]>;
  /** Exact per-episode credits (cast + guest stars + key crew). */
  getEpisodeCredits(
    showProviderId: string,
    seasonNumber: number,
    episodeNumber: number,
  ): Promise<ProviderEpisodeCredit[]>;
  /** A person's detail + TV filmography. */
  getPerson(providerId: string): Promise<ProviderPersonDetail | null>;
  /** Shows similar to a given show (the recommendation candidate source). */
  getRecommendations(providerId: string): Promise<ProviderShowSummary[]>;
  popularShows(page?: number): Promise<ProviderShowSummary[]>;
  /** Browse the catalog by genre, sorted by popularity or rating. */
  discoverShows(opts: DiscoverOptions): Promise<ProviderShowSummary[]>;
  imageUrl(path: string | null, size?: ImageSize): string | null;
}

export type DiscoverSort = "popularity" | "rating";

export type DiscoverOptions = {
  /** Provider genre id (TMDB genre id). Omit for all genres. */
  genreId?: number;
  sort?: DiscoverSort;
  page?: number;
};

let cached: TVProvider | null = null;

/** Returns the configured TV metadata provider (TMDB today). */
export function getProvider(): TVProvider {
  if (cached) return cached;
  // Lazy require avoids importing the adapter (and its env checks) until needed.
  const { TmdbProvider } = require("./tmdb") as typeof import("./tmdb");
  cached = new TmdbProvider();
  return cached;
}
