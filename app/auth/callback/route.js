import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { isAllowedAdmin } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Where Google sends you back to. Exchanges the code for a session, then checks
 * the account against the allowlist before letting it anywhere near /admin.
 */
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=No+code+returned+from+Google', url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!isAllowedAdmin(user)) {
    // Signed in as someone who is not allowed. Drop the session immediately so
    // no half-authenticated state lingers.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?denied=1', url.origin));
  }

  return NextResponse.redirect(new URL('/admin', url.origin));
}
