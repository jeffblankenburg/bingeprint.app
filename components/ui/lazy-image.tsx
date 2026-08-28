"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Image that fades in as it loads — lazy by default (native `loading="lazy"` +
 * async decode), so it streams into the page smoothly for every visitor,
 * including the first one who triggered the import. Sits over a neutral
 * placeholder so there's never a broken-image flash.
 *
 * IMPORTANT: a cached image can finish loading before React hydrates and wires
 * up `onLoad`, which would leave it stuck at opacity-0. We check `img.complete`
 * on mount to cover that case.
 *
 * Set `eager` for above-the-fold hero images (poster/backdrop).
 */
export function LazyImage({
  src,
  alt,
  className,
  eager = false,
  objectPosition,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  objectPosition?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      style={objectPosition ? { objectPosition } : undefined}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-500",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
