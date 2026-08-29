import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { TopNav } from "@/components/app/nav";

/**
 * Sticky app header used on every page (in-app and public show pages). Adapts to
 * auth: signed-in users get the desktop nav + a persistent Search affordance;
 * signed-out users get a Sign in button. Account actions (settings, streaming,
 * sign out) live under the Profile nav destination, keeping the header clean.
 */
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="pt-safe sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* Signature SMPTE test-pattern strip on every page */}
      <SmpteBars height="3px" />
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href={user ? "/dashboard" : "/"} aria-label="Bingeprint home">
          <Logo size={22} />
        </Link>

        {user && <TopNav />}

        <div className="flex items-center gap-1">
          {user ? (
            <Link
              href="/search"
              aria-label="Search"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="size-5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
