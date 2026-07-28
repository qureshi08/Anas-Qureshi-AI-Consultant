import { createAdminClient } from '../supabase/admin';

/**
 * Google credentials used for SENDING (gmail.send), which is a different thing
 * from the Google sign-in that gets you into /admin.
 *
 * Signing in only proves who you are. Putting mail in your outbox needs the
 * gmail.send scope, which Google will not grant through a login flow, so the
 * app needs its own OAuth client.
 *
 * Read order: env vars FIRST, settings table only as a fallback. It has to be
 * this way round. A half-finished or stale value left in the settings form
 * would otherwise outrank the env vars and get sent to Google, which answers
 * `invalid_client` and gives no hint about where the bad value came from.
 *
 * Values are trimmed because pasting into a dashboard field very often carries
 * a trailing space or newline, and Google treats that as a different client.
 */
function clean(v) {
  if (!v) return null;
  const t = String(v).trim().replace(/^["']|["']$/g, '');
  return t || null;
}

export async function getGoogleCreds() {
  const envId = clean(process.env.GOOGLE_CLIENT_ID);
  const envSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, source: 'env' };
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('settings').select('key, value')
    .in('key', ['google_client_id', 'google_client_secret']);

  const s = {};
  (rows || []).forEach(r => { if (r.value) s[r.key] = clean(r.value); });

  return {
    clientId: s.google_client_id || envId || null,
    clientSecret: s.google_client_secret || envSecret || null,
    source: s.google_client_id ? 'settings' : (envId ? 'env' : 'none'),
  };
}
