'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

/**
 * Supabase client for use in Client Components (runs in the browser).
 * Reads the public anon key; all access is still gated by Row Level Security.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
