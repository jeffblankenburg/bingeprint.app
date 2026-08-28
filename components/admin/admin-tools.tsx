"use client";

import { useActionState, useState, useTransition } from "react";
import {
  adminImportShow,
  adminSyncCatalog,
  type AdminActionState,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL: AdminActionState = { ok: false };

export function AdminTools() {
  const [importState, importAction, importing] = useActionState(
    adminImportShow,
    INITIAL,
  );
  const [syncPending, startSync] = useTransition();
  const [syncResult, setSyncResult] = useState<AdminActionState | null>(null);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Import a show by TMDB id */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <h3 className="font-display font-semibold">Import a show</h3>
        <form action={importAction} className="space-y-2">
          <Input
            name="tmdb_id"
            inputMode="numeric"
            placeholder="TMDB id (e.g. 95396)"
            required
          />
          <Button type="submit" size="sm" disabled={importing}>
            {importing ? "Importing…" : "Import / refresh"}
          </Button>
        </form>
        {importState.message && (
          <p className="text-xs text-primary">{importState.message}</p>
        )}
        {importState.error && (
          <p className="text-xs text-destructive">{importState.error}</p>
        )}
      </div>

      {/* Catalog sync */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <h3 className="font-display font-semibold">Catalog sync</h3>
        <p className="text-xs text-muted-foreground">
          Re-download the TMDB export and refresh the skeleton (runs daily
          automatically).
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={syncPending}
          onClick={() => startSync(async () => setSyncResult(await adminSyncCatalog()))}
        >
          {syncPending ? "Syncing…" : "Run catalog sync now"}
        </Button>
        {syncResult?.message && (
          <p className="text-xs text-primary">{syncResult.message}</p>
        )}
        {syncResult?.error && (
          <p className="text-xs text-destructive">{syncResult.error}</p>
        )}
      </div>
    </div>
  );
}
