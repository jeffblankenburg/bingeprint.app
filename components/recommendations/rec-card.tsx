"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X, Eye } from "lucide-react";
import { recordRecommendationFeedback } from "@/lib/recommendations/actions";
import type { RecommendationFeedback } from "@/lib/analytics/events";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { LazyImage } from "@/components/ui/lazy-image";

const TMDB_IMAGE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

export function RecCard({
  showId,
  tmdbId,
  name,
  posterPath,
  because,
}: {
  showId: string;
  tmdbId: number;
  name: string;
  posterPath: string | null;
  because: string[];
}) {
  const [gone, setGone] = useState(false);
  const [, startTransition] = useTransition();

  function feedback(kind: RecommendationFeedback) {
    setGone(true);
    startTransition(() => void recordRecommendationFeedback(showId, kind));
  }

  if (gone) return null;

  return (
    <div className="w-40 shrink-0">
      <Link href={`/show/${tmdbId}`}>
        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
          {posterPath ? (
            <LazyImage src={`${TMDB_IMAGE}/w342${posterPath}`} alt={name} />
          ) : (
            <SmpteBars height="100%" />
          )}
        </div>
        <p className="mt-1.5 line-clamp-1 text-sm font-medium">{name}</p>
      </Link>
      {because.length > 0 && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
          Because you loved{" "}
          <span className="text-foreground">{because.join(", ")}</span>
        </p>
      )}
      <div className="mt-2 flex items-center gap-1">
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
