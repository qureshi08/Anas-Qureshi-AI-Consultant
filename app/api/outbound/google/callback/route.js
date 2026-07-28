import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminUser } from '../../../../../lib/requireAdmin';
import { createAdminClient } from '../../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/admin/inboxes?error=no-code', request.url));

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('settings').select('key, value')
    .in('key', ['google_client_id', 'google_client_secret']);
  const s = {};
  (rows || []).forEach(r => { s[r.key] = r.value; });

  try {
    const oauth2Client = new google.auth.OAuth2(
      s.google_client_id, s.google_client_secret, `${url.origin}/api/outbound/google/callback`,
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const info = await oauth2.userinfo.get();

    await admin.from('sending_accounts').upsert({
      email: info.data.email,
      sender_name: info.data.name,
      refresh_token: tokens.refresh_token || null,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      active: 1,
    }, { onConflict: 'email' });

    return NextResponse.redirect(new URL('/admin/inboxes?connected=1', request.url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin/inboxes?error=${encodeURIComponent(err.message)}`, request.url),
    );
  }
}
