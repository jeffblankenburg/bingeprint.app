import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Backed by the request cookie store so the user's session is honored and RLS
 * applies. In pure Server Components the cookie `setAll` is a no-op (they can't
 * write cookies) — token refresh happens in `proxy.ts` instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore; the
            // session is refreshed in proxy.ts.
          }
        },
      },
    },
  );
}
