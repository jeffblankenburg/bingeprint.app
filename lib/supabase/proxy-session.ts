import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/types';

/**
 * Refreshes the Supabase auth session on every request and, when needed, writes
 * refreshed auth cookies onto the outgoing response. Server Components cannot
 * set cookies, so this proxy step is what keeps sessions alive across requests.
 *
 * Returns the response (with any refreshed cookies) and the current user so the
 * proxy can make redirect decisions for protected routes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth. Do not use
  // getSession() here — it trusts the cookie without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
