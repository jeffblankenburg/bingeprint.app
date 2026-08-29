import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProvider } from "@/lib/tv/provider";
import { OnboardingGrid } from "@/components/onboarding/onboarding-grid";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { Logo } from "@/components/brand/logo";
import { SmpteBars } from "@/components/brand/smpte-bars";

export const metadata: Metadata = { title: "Build your Bingeprint" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireUser();

  // Popular shows with posters, deduped.
  const provider = getProvider();
  const [p1, p2] = await Promise.all([
    provider.popularShows(1).catch(() => []),
    provider.popularShows(2).catch(() => []),
  ]);
  const seen = new Set<number>();
  const shows = [...p1, ...p2]
    .filter((s) => s.posterPath)
    .map((s) => ({ tmdbId: Number(s.providerId), name: s.name, posterPath: s.posterPath }))
    .filter((s) => (seen.has(s.tmdbId) ? false : (seen.add(s.tmdbId), true)))
    .slice(0, 30);

  return (
    <main className="pt-safe min-h-dvh">
      <SmpteBars height="4px" />
      <TrackOnMount event="onboarding_started" />
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link href="/dashboard" className="inline-flex">
          <Logo size={24} />
        </Link>

        <div className="mt-6 space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Tell us what you love
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Build your Bingeprint
          </h1>
          <p className="text-sm text-muted-foreground">
            Rate a few shows you&rsquo;ve watched. The more you tell us, the sharper
            your recommendations — you can always add more later.
          </p>
        </div>

        <div className="mt-6">
          <OnboardingGrid shows={shows} />
        </div>
      </div>
    </main>
  );
}
