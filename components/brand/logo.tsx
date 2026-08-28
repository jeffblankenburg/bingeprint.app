import { cn } from "@/lib/utils";

/** The Bingeprint mark: a fingerprint whose ridges are the SMPTE color bars. */
export function BingeprintMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="112" fill="#0B0B0C" />
      <g strokeWidth="15" strokeLinecap="round" fill="none">
        <path d="M256 106 a150 150 0 0 1 150 150 v78" stroke="#C8C8C8" />
        <path d="M256 106 a150 150 0 0 0 -150 150 v78" stroke="#C8C8C8" />
        <path d="M256 130 a126 126 0 0 1 126 126 v70" stroke="#D6D400" />
        <path d="M256 130 a126 126 0 0 0 -126 126 v70" stroke="#D6D400" />
        <path d="M256 154 a102 102 0 0 1 102 102 v62" stroke="#12C4CE" />
        <path d="M256 154 a102 102 0 0 0 -102 102 v62" stroke="#12C4CE" />
        <path d="M256 178 a78 78 0 0 1 78 78 v54" stroke="#18C24A" />
        <path d="M256 178 a78 78 0 0 0 -78 78 v54" stroke="#18C24A" />
        <path d="M256 202 a54 54 0 0 1 54 54 v46" stroke="#C81FB4" />
        <path d="M256 202 a54 54 0 0 0 -54 54 v46" stroke="#C81FB4" />
        <path d="M256 226 a30 30 0 0 1 30 30 v40" stroke="#E23B2E" />
        <path d="M256 226 a30 30 0 0 0 -30 30 v40" stroke="#E23B2E" />
        <path d="M256 256 v42" stroke="#3B6FE2" />
      </g>
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({
  className,
  size = 28,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BingeprintMark size={size} />
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight">
          Bingeprint
        </span>
      )}
    </span>
  );
}
