import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const { user, profile } = await requireUser();
  const name =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          On now
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome, {name}.
        </h1>
      </div>

      {/* Continue Watching — empty until the tracking milestone lands */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Continue Watching</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <SmpteBars height="5px" />
          <div className="space-y-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Build your Bingeprint by telling us what
              you&rsquo;ve watched — then we&rsquo;ll show what&rsquo;s next.
            </p>
            <div className="flex justify-center gap-3">
              <Button disabled>Find a show</Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Search &amp; tracking arrive in the next milestone.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
