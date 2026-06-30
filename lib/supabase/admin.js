// Service-role Supabase client. SERVER-ONLY (never imported into a client
// component). Bypasses RLS, so it can read/write the OutboundOS tables that
// are RLS-locked against the anon key. Always gate its use behind an auth check.
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
