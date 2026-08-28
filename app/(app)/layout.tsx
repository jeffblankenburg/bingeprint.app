import { requireUser } from "@/lib/auth";
import { TopBar } from "@/components/app/top-bar";
import { BottomNav } from "@/components/app/bottom-nav";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

/**
 * Authenticated app shell. Guarantees a session (redirects to /login otherwise)
 * and frames every in-app page with the top bar + bottom navigation.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <TrackOnMount event="session_started" />
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
