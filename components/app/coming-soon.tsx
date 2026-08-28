import { SmpteBars } from "@/components/brand/smpte-bars";

/** Placeholder for in-app sections that arrive in later milestones. */
export function ComingSoon({
  title,
  blurb,
  tag = "Coming soon",
}: {
  title: string;
  blurb: string;
  tag?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <SmpteBars height="5px" />
      <div className="space-y-2 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {tag}
        </p>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{blurb}</p>
      </div>
    </div>
  );
}
