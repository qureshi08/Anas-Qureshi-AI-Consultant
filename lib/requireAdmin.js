import { createClient } from './supabase/server';
import { isAllowedAdmin } from './auth';

/**
 * Single gate for API routes. Returns the user, or null if the caller is not an
 * allowed admin. Checking only for a session is NOT enough now that sign-in is
 * Google OAuth: anyone can get a valid session, so every route must confirm
 * *who* it is, not just *that* they are signed in.
 */
export async function getAdminUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAllowedAdmin(user) ? user : null;
}
