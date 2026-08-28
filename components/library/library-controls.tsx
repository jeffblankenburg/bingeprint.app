"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { setShowStatus, removeShowFromLibrary } from "@/lib/library/actions";
import type { ShowStatus } from "@/lib/analytics/events";

const STATUS_LABELS: Record<ShowStatus, string> = {
  want_to_watch: "Want to Watch",
  watching: "Watching",
  watched: "Watched",
  paused: "Paused",
  abandoned: "Abandoned",
};

/** Inline status changer + remove control for a library row. */
export function LibraryControls({
  showId,
  status,
}: {
  showId: string;
  status: ShowStatus;
}) {
  const [current, setCurrent] = useState<ShowStatus>(status);
  const [pending, startTransition] = useTransition();

  function change(to: ShowStatus) {
    const from = current;
    setCurrent(to);
    startTransition(async () => {
      const res = await setShowStatus(showId, from, to);
      if (!res.ok) setCurrent(from);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeShowFromLibrary(showId);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <select
        aria-label="Status"
        value={current}
        disabled={pending}
        onChange={(e) => change(e.target.value as ShowStatus)}
        className="rounded-md border border-input bg-card px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {(Object.keys(STATUS_LABELS) as ShowStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Remove from library"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
