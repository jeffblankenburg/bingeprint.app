"use client";

import { useState, useTransition } from "react";
import { Heart, ThumbsUp, ThumbsDown } from "lucide-react";
import { rateOnboardingShow, finishOnboarding } from "@/lib/onboarding/actions";
import type { Reaction } from "@/lib/analytics/events";
import { LazyImage } from "@/components/ui/lazy-image";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { cn } from "@/lib/utils";

const TMDB_IMAGE =
  process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p";

type Show = { tmdbId: number; name: string; posterPath: string | null };

const REACTIONS: { key: Reaction; label: string; icon: typeof Heart }[] = [
  { key: "loved", label: "Loved it", icon: Heart },
  { key: "liked", label: "Liked it", icon: ThumbsUp },
  { key: "not_for_me", label: "Not for me", icon: ThumbsDown },
];

export function OnboardingGrid({ shows }: { shows: Show[] }) {
  const [reactions, setReactions] = useState<Map<number, Reaction>>(new Map());
  const [, startTransition] = useTransition();

  function rate(tmdbId: number, reaction: Reaction) {
    setReactions((prev) => {
      const next = new Map(prev);
      next.set(tmdbId, reaction);
      return next;
    });
    startTransition(() => void rateOnboardingShow(tmdbId, reaction));
  }

  const positives = [...reactions.values()].filter((r) => r === "loved" || r === "liked").length;
  const ready = positives >= 3;

  return (
    <div className="pb-28">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shows.map((show) => {
          const picked = reactions.get(show.tmdbId);
          return (
            <div key={show.tmdbId} className="flex flex-col">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border bg-secondary">
                {show.posterPath ? (
                  <LazyImage src={`${TMDB_IMAGE}/w342${show.posterPath}`} alt={show.name} />
                ) : (
                  <SmpteBars height="100%" />
                )}
              </div>
              <p className="mt-1.5 line-clamp-1 text-sm font-medium">{show.name}</p>
              <div className="mt-1.5 flex gap-1">
                {REACTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => rate(show.tmdbId, key)}
                    aria-label={label}
                    aria-pressed={picked === key}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-md border py-1.5 transition-colors",
                      picked === key
                        ? key === "not_for_me"
                          ? "border-destructive/50 bg-destructive/15 text-destructive"
                          : "border-primary/50 bg-primary/15 text-primary"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky progress footer */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-mono text-xs text-muted-foreground">
            {ready ? (
              <span className="text-primary">Your Bingeprint is ready.</span>
            ) : (
              `Rate ${3 - positives} more you've watched`
            )}
          </p>
          <div className="flex items-center gap-2">
            <form action={finishOnboarding}>
              <button
                type="submit"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Skip
              </button>
            </form>
            <form action={finishOnboarding}>
              <button
                type="submit"
                disabled={!ready}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                Build my Bingeprint →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
