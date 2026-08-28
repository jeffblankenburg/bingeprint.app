"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { importShow } from "@/lib/tv/ingest";
import { syncCatalog } from "@/lib/tv/catalog";

export type AdminActionState = { ok: boolean; message?: string; error?: string };

/** Import (or force-refresh) a show's full detail by TMDB id. */
export async function adminImportShow(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const raw = String(formData.get("tmdb_id") ?? "").trim();
  const tmdbId = parseInt(raw, 10);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return { ok: false, error: "Enter a valid TMDB id." };
  }
  try {
    await importShow(String(tmdbId), { force: true });
    revalidatePath("/admin");
    revalidatePath(`/show/${tmdbId}`);
    return { ok: true, message: `Imported show ${tmdbId}.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import failed." };
  }
}

/** Run the catalog skeleton sync on demand. */
export async function adminSyncCatalog(): Promise<AdminActionState> {
  await requireAdmin();
  try {
    const result = await syncCatalog();
    revalidatePath("/admin");
    return {
      ok: true,
      message: `Synced ${result.upserted.toLocaleString()} shows (export ${result.date}).`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed." };
  }
}
