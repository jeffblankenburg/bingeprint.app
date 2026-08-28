"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Loader2 } from "lucide-react";
import { addShowToLibrary } from "@/lib/library/actions";
import type { ShowStatus } from "@/lib/analytics/events";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ShowStatus, string> = {
  want_to_watch: "Want to Watch",
  watching: "Watching",
  watched: "Watched",
  paused: "Paused",
  abandoned: "Abandoned",
};

/**
 * Compact add-to-library control for search results. Picking a status adds the
 * show with that status; the button then reflects the tracked state.
 */
export function AddToLibrary({
  tmdbId,
  initialStatus = null,
}: {
  tmdbId: number;
  initialStatus?: ShowStatus | null;
}) {
  const [status, setStatus] = useState<ShowStatus | null>(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add(next: ShowStatus) {
    setError(null);
    startTransition(async () => {
      const res = await addShowToLibrary(tmdbId, next);
      if (res.ok) {
        setStatus(next);
        track("show_added", { show_id: String(tmdbId), status: next, source: "search" });
      } else {
        setError(res.error ?? "Failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
          status
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-input bg-card",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : status ? (
          <Check className="size-3.5" />
        ) : (
          <Plus className="size-3.5" />
        )}
        <select
          aria-label="Add to library"
          className="cursor-pointer bg-transparent outline-none"
          value={status ?? ""}
          disabled={pending}
          onChange={(e) => add(e.target.value as ShowStatus)}
        >
          <option value="" disabled>
            Add
          </option>
          {(Object.keys(STATUS_LABELS) as ShowStatus[]).map((s) => (
            <option key={s} value={s} className="bg-card text-foreground">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
