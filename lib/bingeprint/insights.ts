import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Insights = {
  episodes_watched: number;
  shows_watched: number;
  minutes_watched: number;
  shows_completed: number;
  genres: { name: string; episodes: number; pct: number }[];
  networks: { name: string; episodes: number }[];
  people: { name: string; episodes: number }[];
  decades: { decade: number; episodes: number }[];
};

const EMPTY: Insights = {
  episodes_watched: 0,
  shows_watched: 0,
  minutes_watched: 0,
  shows_completed: 0,
  genres: [],
  networks: [],
  people: [],
  decades: [],
};

/** Computes the signed-in user's Bingeprint insights via the Postgres RPC. */
export async function getInsights(): Promise<Insights> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_insights");
  return { ...EMPTY, ...((data as Partial<Insights>) ?? {}) };
}
