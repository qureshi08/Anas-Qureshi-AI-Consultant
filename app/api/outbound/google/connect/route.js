import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminUser } from '../../../../../lib/requireAdmin';
import { createAdminClient } from '../../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

function redirectUri(request) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/outbound/google/callback`;
}

export async function GET(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('settings').select('key, value')
    .in('key', ['google_client_id', 'google_client_secret']);
  const s = {};
  (rows || []).forEach(r => { s[r.key] = r.value; });

  if (!s.google_client_id || !s.google_client_secret) {
    return NextResponse.redirect(new URL('/admin/inboxes?error=no-google-creds', request.url));
  }

  const oauth2Client = new google.auth.OAuth2(
    s.google_client_id, s.google_client_secret, redirectUri(request),
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces a refresh_token back every time
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });

  return NextResponse.redirect(url);
}
