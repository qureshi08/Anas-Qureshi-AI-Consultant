import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { getAdminUser } from '../../../../lib/requireAdmin';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getGoogleCreds } from '../../../../lib/outbound/googleCreds';

export const dynamic = 'force-dynamic';

/** Verify an inbox can actually authenticate, before you rely on it. */
export async function POST(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: acc } = await admin.from('sending_accounts').select('*').eq('id', id).single();
  if (!acc) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 });

  try {
    if (acc.refresh_token) {
      const { clientId, clientSecret } = await getGoogleCreds();
      const client = new google.auth.OAuth2(clientId, clientSecret);
      client.setCredentials({ refresh_token: acc.refresh_token });
      const gmail = google.gmail({ version: 'v1', auth: client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return NextResponse.json({ success: true, message: `Connected as ${profile.data.emailAddress}` });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: acc.email, pass: acc.app_password },
    });
    await transporter.verify();
    return NextResponse.json({ success: true, message: `Connected as ${acc.email}` });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
