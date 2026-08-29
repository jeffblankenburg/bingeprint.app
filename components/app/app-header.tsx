import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth-actions";
import { Logo } from "@/components/brand/logo";
import { TopNav } from "@/components/app/nav";

/**
 * Sticky app header used on every page (in-app and public show pages). Adapts to
 * auth: signed-in users get the full nav + settings/sign-out; signed-out users
 * get a Sign in button. The logo takes signed-in users to their dashboard.
 */
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link href={user ? "/dashboard" : "/"} aria-label="Bingeprint home">
          <Logo size={22} />
        </Link>

        {user && <TopNav />}

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/settings"
                aria-label="Settings"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Settings className="size-4" />
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </>
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
