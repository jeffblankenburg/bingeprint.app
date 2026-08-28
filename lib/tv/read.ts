import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { importShowCore, importShowEpisodes } from "@/lib/tv/ingest";
import type { Tables } from "@/lib/supabase/types";

const DETAIL_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export type WatchProvider = {
  id: string;
  name: string;
  logoPath: string | null;
  offerType: string;
};

export type ShowCore = {
  show: Tables<"shows">;
  genres: string[];
  networks: Tables<"networks">[];
  watch: WatchProvider[];
  cast: Array<{ person: Tables<"people">; character: string | null; role: string }>;
  seasons: Tables<"seasons">[];
};

// Prefer subscription/streaming over rent/buy when a provider offers both.
const OFFER_RANK: Record<string, number> = {
  flatrate: 0,
  ads: 1,
  free: 2,
  rent: 3,
  buy: 4,
};

/**
 * Fast path for the show page: one API call fills the hero (artwork, overview,
 * genres, networks, cast, season list) so it renders immediately. Seamless —
 * imports core detail on first visit, then reads it back. `cache()`-deduped so
 * generateMetadata and the page share one call. Null only for unknown ids.
 */
export const getShowCore = cache(_getShowCore);

async function _getShowCore(tmdbId: number): Promise<ShowCore | null> {
  const admin = createAdminClient();

  let { data: show } = await admin
    .from("shows")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (!show || !show.core_synced_at) {
    try {
      await importShowCore(String(tmdbId));
    } catch {
      if (!show) return null;
    }
    ({ data: show } = await admin
      .from("shows")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .maybeSingle());
  }
  if (!show) return null;

  const [genresRes, networksRes, watchRes, castRes, seasonsRes] = await Promise.all([
    admin.from("show_genres").select("genres(name)").eq("show_id", show.id),
    admin.from("show_networks").select("networks(*)").eq("show_id", show.id),
    admin
      .from("show_streaming")
      .select("offer_type, streaming_services(id, name, logo_path)")
      .eq("show_id", show.id)
      .eq("region", "US"),
    admin
      .from("credits")
      .select("role, character, order, people(*)")
      .eq("show_id", show.id)
      .in("role", ["cast", "creator"])
      .order("order", { ascending: true, nullsFirst: false })
      .limit(18),
    admin
      .from("seasons")
      .select("*")
      .eq("show_id", show.id)
      .order("season_number", { ascending: true }),
  ]);

  const genres = (genresRes.data ?? [])
    .map((g) => (g.genres as { name: string } | null)?.name)
    .filter((n): n is string => !!n);

  const networks = (networksRes.data ?? [])
    .map((n) => n.networks as Tables<"networks"> | null)
    .filter((n): n is Tables<"networks"> => !!n);

  const cast = (castRes.data ?? [])
    .map((c) => ({
      person: c.people as Tables<"people"> | null,
      character: c.character,
      role: c.role as string,
    }))
    .filter(
      (c): c is { person: Tables<"people">; character: string | null; role: string } =>
        !!c.person,
    );

  // Dedupe providers by service, keeping the best offer type (flatrate first).
  const bestByService = new Map<string, WatchProvider>();
  for (const row of watchRes.data ?? []) {
    const svc = row.streaming_services as
      | { id: string; name: string; logo_path: string | null }
      | null;
    if (!svc) continue;
    const candidate: WatchProvider = {
      id: svc.id,
      name: svc.name,
      logoPath: svc.logo_path,
      offerType: row.offer_type,
    };
    const existing = bestByService.get(svc.id);
    if (
      !existing ||
      (OFFER_RANK[candidate.offerType] ?? 9) < (OFFER_RANK[existing.offerType] ?? 9)
    ) {
      bestByService.set(svc.id, candidate);
    }
  }
  const watch = [...bestByService.values()].sort(
    (a, b) => (OFFER_RANK[a.offerType] ?? 9) - (OFFER_RANK[b.offerType] ?? 9),
  );

  return { show, genres, networks, watch, cast, seasons: seasonsRes.data ?? [] };
}

/**
 * Slow path (streamed): ensures episodes are imported, then returns them grouped
 * by season number. Kept separate so the hero never waits on the per-season
 * fetches.
 */
export async function getShowEpisodes(
  tmdbId: number,
  showId: string,
): Promise<Map<number, Tables<"episodes">[]>> {
  const admin = createAdminClient();

  const { data: show } = await admin
    .from("shows")
    .select("details_synced_at")
    .eq("id", showId)
    .maybeSingle();

  const fresh =
    show?.details_synced_at &&
    Date.now() - new Date(show.details_synced_at).getTime() < DETAIL_TTL_MS;

  if (!fresh) {
    const { data: seasons } = await admin
      .from("seasons")
      .select("id, season_number")
      .eq("show_id", showId);
    const seasonNumbers = (seasons ?? []).map((s) => s.season_number);
    const map = new Map((seasons ?? []).map((s) => [s.season_number, s.id]));
    try {
      await importShowEpisodes(String(tmdbId), showId, seasonNumbers, map);
    } catch {
      // best-effort; return whatever episodes exist
    }
  }

  const { data: eps } = await admin
    .from("episodes")
    .select("*")
    .eq("show_id", showId)
    .order("season_number", { ascending: true })
    .order("episode_number", { ascending: true });

  const bySeason = new Map<number, Tables<"episodes">[]>();
  for (const e of eps ?? []) {
    const list = bySeason.get(e.season_number) ?? [];
    list.push(e);
    bySeason.set(e.season_number, list);
  }
  return bySeason;
}
