import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "./provider";
import type { ProviderEpisodeCredit } from "./provider";
import type { TablesInsert } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Fetch exact per-episode credits (cast + guest stars + director/writer) for
 * every episode of a show and store them in `episode_credits`. This is what
 * makes person-level stats precise ("% of watched episodes featuring X").
 *
 * Idempotent + resumable: skips episodes already enriched (episodes.credits_
 * synced_at) unless `force`. One TMDB call per episode, so it runs in the
 * background when a show is first tracked — never inline with a user request.
 */
export async function enrichEpisodeCredits(
  showId: string,
  opts: { force?: boolean } = {},
): Promise<{ enriched: number }> {
  const admin = createAdminClient();
  const provider = getProvider();

  const { data: show } = await admin
    .from("shows")
    .select("tmdb_id")
    .eq("id", showId)
    .maybeSingle();
  if (!show) return { enriched: 0 };

  const { data: eps } = await admin
    .from("episodes")
    .select("id, season_number, episode_number, credits_synced_at")
    .eq("show_id", showId)
    .gt("season_number", 0);

  const todo = (eps ?? []).filter((e) => opts.force || !e.credits_synced_at);
  let enriched = 0;

  await mapWithConcurrency(todo, 8, async (ep) => {
    let credits: ProviderEpisodeCredit[];
    try {
      credits = await provider.getEpisodeCredits(
        String(show.tmdb_id),
        ep.season_number,
        ep.episode_number,
      );
    } catch {
      credits = [];
    }

    if (credits.length > 0) {
      // Upsert people, then map tmdb_id -> local id.
      const people = dedupeBy(credits.map((c) => c.person), (p) => p.providerId);
      const { data: rows } = await admin
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
      const idByTmdb = new Map((rows ?? []).map((r) => [r.tmdb_id, r.id]));

      // One row per (person, role); prefer cast over guest.
      const seen = new Set<string>();
      const ecRows: TablesInsert<"episode_credits">[] = [];
      for (const c of credits) {
        const pid = idByTmdb.get(Number(c.person.providerId));
        if (!pid) continue;
        const key = `${pid}:${c.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        ecRows.push({
          episode_id: ep.id,
          person_id: pid,
          role: c.role,
          character: c.character,
          billing_order: c.order,
          source: c.source,
        });
      }

      await admin.from("episode_credits").delete().eq("episode_id", ep.id);
      if (ecRows.length) await admin.from("episode_credits").insert(ecRows);
    }

    await admin
      .from("episodes")
      .update({ credits_synced_at: new Date().toISOString() })
      .eq("id", ep.id);
    enriched++;
  });

  await admin
    .from("shows")
    .update({ episode_credits_synced_at: new Date().toISOString() })
    .eq("id", showId);

  return { enriched };
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
