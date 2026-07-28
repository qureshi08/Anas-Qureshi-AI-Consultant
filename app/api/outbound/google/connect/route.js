import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminUser } from '../../../../../lib/requireAdmin';
import { getGoogleCreds } from '../../../../../lib/outbound/googleCreds';

export const dynamic = 'force-dynamic';

function redirectUri(request) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/outbound/google/callback`;
}

export async function GET(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { clientId, clientSecret } = await getGoogleCreds();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/admin/inboxes?error=no-google-creds', request.url));
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri(request));

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    // 'select_account' is what makes connecting a SECOND, THIRD, FOURTH inbox
    // possible. Without it Google silently reuses whichever account the browser
    // is already signed into, so every attempt reconnects the same mailbox.
    // 'consent' forces a refresh_token back every time.
    prompt: 'select_account consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });

  return NextResponse.redirect(url);
}
