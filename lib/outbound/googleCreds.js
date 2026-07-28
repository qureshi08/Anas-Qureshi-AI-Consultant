import { createAdminClient } from '../supabase/admin';

/**
 * Google credentials used for SENDING (gmail.send), which is a different thing
 * from the Google sign-in that gets you into /admin.
 *
 * Signing in only proves who you are. Putting mail in your outbox needs the
 * gmail.send scope, which Google will not grant through a login flow, so the
 * app needs its own OAuth client.
 *
 * Read order: the settings table first (set through the Inboxes page), then
 * env vars. The same credentials from Google Cloud work for both jobs, so you
 * can set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in Vercel once and never
 * touch the settings form.
 */
export async function getGoogleCreds() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('settings').select('key, value')
    .in('key', ['google_client_id', 'google_client_secret']);

  const s = {};
  (rows || []).forEach(r => { if (r.value) s[r.key] = r.value; });

  return {
    clientId: s.google_client_id || process.env.GOOGLE_CLIENT_ID || null,
    clientSecret: s.google_client_secret || process.env.GOOGLE_CLIENT_SECRET || null,
  };
}
