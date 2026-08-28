/**
 * TV data layer — public surface.
 *
 * Import from "@/lib/tv" rather than reaching into individual modules. The
 * concrete provider (TMDB today) stays behind `getProvider()`.
 */
export { getProvider } from "./provider";
export { importShow, cacheShowSummary } from "./ingest";
export type {
  TVProvider,
  ProviderShowSummary,
  ProviderShowDetail,
  ProviderSeason,
  ProviderEpisode,
  ProviderPerson,
  ProviderCastMember,
  ProviderNetwork,
  ProviderWatchOffer,
  SearchResults,
  ImageSize,
} from "./provider";
