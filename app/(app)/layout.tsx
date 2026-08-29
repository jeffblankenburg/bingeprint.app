import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app/app-header";
import { BottomTabs } from "@/components/app/nav";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

/**
 * Authenticated app shell. Guarantees a session (redirects to /login otherwise)
 * and frames every in-app page with the sticky header + mobile bottom tabs.
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
      <AppHeader />
      <main className="pb-bottom-nav mx-auto w-full max-w-3xl flex-1 px-4 pt-5">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
