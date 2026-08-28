import { Logo } from "@/components/brand/logo";
import { signOut } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

/** Slim top bar for the authenticated shell: brand + sign out. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Logo size={24} />
        <form action={signOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
