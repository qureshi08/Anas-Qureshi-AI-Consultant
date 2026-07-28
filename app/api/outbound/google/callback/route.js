import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminUser } from '../../../../../lib/requireAdmin';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { getGoogleCreds } from '../../../../../lib/outbound/googleCreds';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/admin/inboxes?error=no-code', request.url));

  const admin = createAdminClient();
  const { clientId, clientSecret } = await getGoogleCreds();

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId, clientSecret, `${url.origin}/api/outbound/google/callback`,
    );
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const info = await oauth2.userinfo.get();

    const row = {
      email: info.data.email,
      sender_name: info.data.name,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      active: 1,
    };
    // Only write refresh_token when Google actually hands one back. Reconnecting
    // an already-linked inbox can return tokens without it, and writing null
    // there would silently break sending from an inbox that was working.
    if (tokens.refresh_token) row.refresh_token = tokens.refresh_token;

    await admin.from('sending_accounts').upsert(row, { onConflict: 'email' });

    return NextResponse.redirect(new URL('/admin/inboxes?connected=1', request.url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/admin/inboxes?error=${encodeURIComponent(err.message)}`, request.url),
    );
  }
}
