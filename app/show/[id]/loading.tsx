import { SmpteBars } from "@/components/brand/smpte-bars";

/** Instant skeleton shown while the show's core detail imports on first visit. */
export default function LoadingShow() {
  return (
    <main className="relative min-h-dvh">
      <SmpteBars height="5px" />
      <div className="h-36 w-full animate-pulse bg-secondary sm:h-56" />
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="-mt-14 flex gap-3 sm:-mt-16 sm:gap-4">
          <div className="aspect-[2/3] w-24 shrink-0 animate-pulse rounded-lg border bg-secondary shadow-xl sm:w-32" />
          <div className="flex flex-1 flex-col justify-end gap-2 pb-2">
            <div className="h-6 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-secondary" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </main>
  );
}
