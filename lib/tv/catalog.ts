import "server-only";

import { gunzipSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

const EXPORT_BASE = "https://files.tmdb.org/p/exports";
const BATCH_SIZE = 1000;
const CONCURRENCY = 5;

interface ExportRow {
  id: number;
  original_name?: string;
  popularity?: number;
  adult?: boolean;
}

interface SkeletonRow {
  tmdb_id: number;
  name: string;
  popularity: number | null;
  adult: boolean;
}

/** MM_DD_YYYY in UTC for a given day offset (0 = today). */
function exportDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}_${dd}_${d.getUTCFullYear()}`;
}

/** Download + gunzip today's TMDB TV export, falling back to prior days. */
async function fetchExport(): Promise<{ text: string; date: string }> {
  let lastErr: unknown;
  // The export publishes ~08:00 UTC; try today, then the two prior days.
  for (let daysAgo = 0; daysAgo <= 2; daysAgo++) {
    const date = exportDate(daysAgo);
    const url = `${EXPORT_BASE}/tv_series_ids_${date}.json.gz`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        lastErr = new Error(`${url} → ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return { text: gunzipSync(buf).toString("utf8"), date };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not fetch TMDB TV export: ${lastErr instanceof Error ? lastErr.message : lastErr}`,
  );
}

/**
 * Sync the full TMDB TV catalog skeleton into `shows` (id, name, popularity,
 * adult). Cheap — one gzip download, no per-show API calls. Idempotent; refreshes
 * popularity daily and adds newly-registered shows. Detail (seasons/episodes) is
 * still fetched on demand by `importShow`.
 */
export async function syncCatalog(
  opts: { limit?: number } = {},
): Promise<{ date: string; parsed: number; upserted: number; batches: number }> {
  const { text, date } = await fetchExport();
  const admin = createAdminClient();

  // Parse newline-delimited JSON into skeleton rows.
  const rows: SkeletonRow[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    let r: ExportRow;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof r.id !== "number") continue;
    rows.push({
      tmdb_id: r.id,
      name: r.original_name?.trim() || "Untitled",
      popularity: typeof r.popularity === "number" ? r.popularity : null,
      adult: r.adult ?? false,
    });
    if (opts.limit && rows.length >= opts.limit) break;
  }

  // Most-popular first, so an interrupted run still covers what matters.
  rows.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const batches: SkeletonRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  let upserted = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map((batch) =>
        admin.rpc("catalog_upsert_skeleton", { rows: batch as unknown as Json }).then(({ data, error }) => {
          if (error) throw error;
          return (data as number) ?? 0;
        }),
      ),
    );
    upserted += results.reduce((a, b) => a + b, 0);
  }

  return { date, parsed: rows.length, upserted, batches: batches.length };
}
