/**
 * Google credentials used for SENDING (gmail.send), which is a different thing
 * from the Google sign-in that gets you into /admin.
 *
 * Signing in only proves who you are. Putting mail in your outbox needs the
 * gmail.send scope, which Google will not grant through a login flow, so the
 * app needs its own OAuth client.
 *
 * Env vars are the ONLY source. There used to be a settings-table fallback with
 * a form in the UI, and it was a trap: a stale or browser-autofilled value left
 * in that form could outrank the real credentials, go to Google, and come back
 * as `invalid_client` with no clue where the bad value came from. One source.
 *
 * Values are trimmed because pasting into a dashboard field very often carries
 * a trailing space, a newline, or an extra line copied along with it, and
 * Google treats any of those as a completely different client.
 */
function clean(v) {
  if (!v) return null;
  const t = String(v).trim().replace(/^["']|["']$/g, '');
  return t || null;
}

export async function getGoogleCreds() {
  const clientId = clean(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  return { clientId, clientSecret, source: clientId && clientSecret ? 'env' : 'none' };
}
