import { cn } from "@/lib/utils";

/** The seven SMPTE bars, in broadcast order. Exposed for reuse in data viz. */
export const SMPTE_BARS = [
  "var(--bar-silver)",
  "var(--bar-yellow)",
  "var(--bar-cyan)",
  "var(--bar-green)",
  "var(--bar-magenta)",
  "var(--bar-red)",
  "var(--bar-blue)",
] as const;

/**
 * The signature SMPTE bar strip. Used as a section divider, top accent, and
 * loading indicator. `height` is any CSS length.
 */
export function SmpteBars({
  className,
  height = "4px",
  rounded = false,
}: {
  className?: string;
  height?: string;
  rounded?: boolean;
}) {
  return (
    <div
      role="presentation"
      className={cn("w-full smpte-bars", rounded && "rounded-full", className)}
      style={{ height }}
    />
  );
}

/**
 * A single horizontal meter rendered in a chosen bar color — the building block
 * for the Bingeprint genre breakdown ("82% Drama").
 */
export function BarMeter({
  value,
  color = "var(--bar-cyan)",
  className,
}: {
  value: number; // 0–100
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
