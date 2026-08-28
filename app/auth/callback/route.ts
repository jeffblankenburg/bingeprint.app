import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackServer, flushServerAnalytics } from "@/lib/analytics/server";

/**
 * Magic-link landing route. Supabase redirects here with a `code` after the
 * user clicks the login link; we exchange it for a session and forward the user
 * into the app (or to onboarding on first run).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const isNew = Date.now() - new Date(data.user.created_at).getTime() < 60_000;
  await trackServer("auth_completed", data.user.id, {
    method: "magic_link",
    is_new_user: isNew,
  });
  await flushServerAnalytics();

  // Send brand-new users to onboarding once it exists; safe today because the
  // proxy will resolve /onboarding, and dashboard is the fallback.
  const destination = next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${destination}`);
}
