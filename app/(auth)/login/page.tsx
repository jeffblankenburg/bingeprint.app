import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { SmpteBars } from "@/components/brand/smpte-bars";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Bingeprint — no password required.",
};

const ERRORS: Record<string, string> = {
  auth: "That link didn't work. Request a fresh one.",
  missing_code: "That link was incomplete. Request a fresh one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/discover", error } = await searchParams;

  // Already signed in? Skip straight into the app.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <main className="pt-safe relative flex min-h-dvh flex-col">
      <SmpteBars height="8px" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-8 inline-flex">
          <Logo size={30} />
        </Link>

        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Stand by
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Sign in to Bingeprint
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&rsquo;ll send you a secure login link — no
            password to remember.
          </p>
        </div>

        {error && ERRORS[error] && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {ERRORS[error]}
          </p>
        )}

        <div className="mt-6">
          <LoginForm next={next} />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to keep your viewing history private by
          default. You control what&rsquo;s public.
        </p>
      </div>
    </main>
  );
}
