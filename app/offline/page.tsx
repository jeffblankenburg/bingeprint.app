import type { Metadata } from "next";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "No signal",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <SmpteBars height="10px" className="absolute inset-x-0 top-0" />
      <Logo size={40} />
      <div className="space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-muted-foreground">
          No Signal
        </p>
        <h1 className="font-display text-2xl font-bold">You&rsquo;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Bingeprint can&rsquo;t reach the network right now. Your tracked shows
          will sync back up as soon as you&rsquo;re reconnected.
        </p>
      </div>
    </main>
  );
}
