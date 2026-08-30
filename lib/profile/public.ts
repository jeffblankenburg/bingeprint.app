import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicProfile = {
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  stats: {
    shows_tracked: number;
    shows_completed: number;
    episodes_watched: number;
  };
  favorites: { tmdb_id: number; name: string; poster_path: string | null }[];
  top_genres: { name: string; episodes: number }[];
};

/**
 * Read a shareable public profile via the `public_profile` security-definer RPC,
 * which returns null unless the user has opted in (profiles.is_public = true) and
 * exposes only curated aggregates — never granular watch history.
 */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_profile", { p_username: username });
  if (error || !data) return null;
  return data as unknown as PublicProfile;
}
