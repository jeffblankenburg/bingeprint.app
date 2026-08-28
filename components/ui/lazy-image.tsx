"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Image that fades in as it loads — lazy by default (native `loading="lazy"` +
 * async decode), so it streams into the page smoothly for every visitor,
 * including the very first one who triggered the import. Sits over a neutral
 * placeholder so there's never a broken-image flash.
 *
 * Set `eager` for above-the-fold hero images (poster/backdrop) so they load
 * with priority instead of lazily.
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
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
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
