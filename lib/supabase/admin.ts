import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * Service-role Supabase client — BYPASSES Row Level Security.
 *
 * Use ONLY in trusted server contexts that must write canonical TV data or run
 * background jobs (ingestion, cron, notifications). Never import this into code
 * that can be reached by an unauthenticated or user-supplied path, and never
 * expose the service-role key to the client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
