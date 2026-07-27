import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Verify an inbox can actually authenticate, before you rely on it. */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: acc } = await admin.from('sending_accounts').select('*').eq('id', id).single();
  if (!acc) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 });

  try {
    if (acc.refresh_token) {
      const { data: rows } = await admin.from('settings').select('key, value')
        .in('key', ['google_client_id', 'google_client_secret']);
      const s = {};
      (rows || []).forEach(r => { s[r.key] = r.value; });
      const client = new google.auth.OAuth2(s.google_client_id, s.google_client_secret);
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
