import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { importShow } from "@/lib/tv/ingest";
import type { Tables } from "@/lib/supabase/types";

export type ShowDetail = {
  show: Tables<"shows">;
  genres: string[];
  networks: Tables<"networks">[];
  cast: Array<{ person: Tables<"people">; character: string | null; role: string }>;
  seasons: Array<Tables<"seasons"> & { episodes: Tables<"episodes">[] }>;
};

/**
 * Returns everything needed to render a show page. Seamless on-demand fill: if
 * the show is skeleton-only (no detail yet), it imports the full tree first so
 * the caller never sees an empty page — the user can't tell cached from fetched.
 * Returns null only if the id doesn't exist at the provider.
 */
export const getShowDetail = cache(_getShowDetail);

async function _getShowDetail(tmdbId: number): Promise<ShowDetail | null> {
  const admin = createAdminClient();

  let { data: show } = await admin
    .from("shows")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Skeleton-only or missing → import full detail now, then re-read.
  if (!show || !show.details_synced_at) {
    try {
      await importShow(String(tmdbId));
    } catch {
      if (!show) return null; // unknown id
    }
    ({ data: show } = await admin
      .from("shows")
      .select("*")
      .eq("tmdb_id", tmdbId)
      .maybeSingle());
  }
  if (!show) return null;

  const [genresRes, networksRes, castRes, seasonsRes, episodesRes] =
    await Promise.all([
      admin.from("show_genres").select("genres(name)").eq("show_id", show.id),
      admin.from("show_networks").select("networks(*)").eq("show_id", show.id),
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
      admin
        .from("episodes")
        .select("*")
        .eq("show_id", show.id)
        .order("season_number", { ascending: true })
        .order("episode_number", { ascending: true }),
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
    .filter((c): c is { person: Tables<"people">; character: string | null; role: string } => !!c.person);

  const episodesBySeason = new Map<number, Tables<"episodes">[]>();
  for (const ep of episodesRes.data ?? []) {
    const list = episodesBySeason.get(ep.season_number) ?? [];
    list.push(ep);
    episodesBySeason.set(ep.season_number, list);
  }
  const seasons = (seasonsRes.data ?? []).map((s) => ({
    ...s,
    episodes: episodesBySeason.get(s.season_number) ?? [],
  }));

  return { show, genres, networks, cast, seasons };
}
