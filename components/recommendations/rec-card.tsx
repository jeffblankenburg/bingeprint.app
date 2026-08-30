"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Plus, X, Eye } from "lucide-react";
import { recordRecommendationFeedback } from "@/lib/recommendations/actions";
import type { RecommendationFeedback } from "@/lib/analytics/events";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { LazyImage } from "@/components/ui/lazy-image";

const TMDB_IMAGE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export type RecItem = {
  showId: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  because: string[];
  offService: boolean;
};

/**
 * A single recommendation card. Presentational — the parent row owns the list
 * and, when `onDone` fires after feedback, drops this card and slides in the
 * next reserve pick.
 */
export function RecCard({
  showId,
  tmdbId,
  name,
  posterPath,
  because,
  offService,
  onDone,
}: RecItem & { onDone: (showId: string) => void }) {
  const [, startTransition] = useTransition();

  function feedback(kind: RecommendationFeedback) {
    startTransition(() => void recordRecommendationFeedback(showId, kind));
    onDone(showId);
  }

  return (
    <div className="flex w-40 shrink-0 flex-col">
      <Link href={`/show/${tmdbId}`}>
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
          {posterPath ? (
            <LazyImage src={`${TMDB_IMAGE}/w342${posterPath}`} alt={name} />
          ) : (
            <SmpteBars height="100%" />
          )}
          {offService && (
            <span className="absolute left-1 top-1 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur">
              not on your services
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-1 text-sm font-medium">{name}</p>
      </Link>
      {/* Fixed 2-line height so button rows align across cards regardless of wrap */}
      <p className="mt-0.5 line-clamp-2 min-h-[1.75rem] text-[11px] leading-tight text-muted-foreground">
        {because.length > 0 && (
          <>
            Because you loved{" "}
            <span className="text-foreground">{because.join(", ")}</span>
          </>
        )}
      </p>
      <div className="mt-auto flex items-center gap-1 pt-2">
        <button
          onClick={() => feedback("interested")}
          aria-label="Add to watchlist"
          className="flex flex-1 items-center justify-center rounded-md border border-primary/40 bg-primary/10 py-1.5 text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="size-4" />
        </button>
        <button
          onClick={() => feedback("already_watched")}
          aria-label="Already watched"
          className="flex items-center justify-center rounded-md border border-input p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Eye className="size-4" />
        </button>
        <button
          onClick={() => feedback("not_my_thing")}
          aria-label="Not for me"
          className="flex items-center justify-center rounded-md border border-input p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
