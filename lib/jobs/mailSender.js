/**
 * One click email sending for the Jobs pipeline (job applications and Startups reverse
 * pitches). Deliberately separate from lib/outbound/emailService.js: that one is the cold
 * email CAMPAIGN engine (leads, email_logs, sequencing, rotates across pooled inboxes) and
 * mixing job/pitch sends into those tables would blend two lanes that are locked separate
 * (see the three lead lanes rule). This sends exactly one email, from Anas's own named
 * inbox, and never touches the outbound campaign tables.
 *
 * Reuses the same Google OAuth client credentials and the same sending_accounts row (the
 * inbox is already connected there for cold email), because the credentials themselves are
 * shared account infrastructure, not campaign data.
 */
import { google } from 'googleapis';
import { createAdminClient } from '../supabase/admin';
import { getGoogleCreds } from '../outbound/googleCreds';

// His real, named personal inbox, the one on the resume. Job and pitch emails go out as him,
// never rotated across the pooled cold outbound inboxes the way campaign sends are.
const JOB_SENDER_EMAIL = 'muhammadanasq@gmail.com';

/**
 * The drafter sometimes returns a cover note but no email_body (seen on its shorter fallback
 * prompt). The cover note is already tailored to the posting, so it becomes the email text
 * instead of the row going out blank.
 */
export function emailBodyFromCoverNote(note, { resumeAttached = true } = {}) {
  const text = String(note || '').trim();
  if (!text) return '';
  return ['Hi,', text, resumeAttached ? 'My resume is attached.' : null, 'Thanks,\nAnas'].filter(Boolean).join('\n\n');
}

/**
 * attachment (optional): { filename, content: Buffer, mimeType }. Job applications attach the
 * tailored resume PDF, because the drafted email ends "Resume attached." and used to go out
 * without the file.
 */
export async function sendJobEmail({ to, subject, body, attachment = null }) {
  if (!to) return { success: false, error: 'No recipient address' };
  // A real incident (JFrog, 2026-09-28): the draft had no email_body, and the application went
  // out as a bare resume with no text at all. Never send an empty email.
  if (!String(body || '').trim()) return { success: false, error: 'Email body is empty, not sent. Redraft the row first.' };
  const admin = createAdminClient();
  const { data: account } = await admin.from('sending_accounts').select('*').eq('email', JOB_SENDER_EMAIL).eq('active', 1).maybeSingle();
  if (!account || !account.refresh_token) {
    return { success: false, error: `Sending inbox ${JOB_SENDER_EMAIL} not connected or missing a refresh token. Reconnect it at /admin/inboxes.` };
  }

  try {
    const { clientId, clientSecret } = await getGoogleCreds();
    if (!clientId || !clientSecret) return { success: false, error: 'GOOGLE_CLIENT_ID/SECRET missing' };
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: account.refresh_token });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const bodyHtml = (body || '').replace(/\n/g, '<br>');
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject || '').toString('base64')}?=`;
    const head = [
      `From: ${account.sender_name || 'Anas Qureshi'} <${account.email}>`,
      `To: ${to}`,
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
    ];
    let messageParts;
    if (attachment && attachment.content) {
      const boundary = `mixed_${Date.now().toString(36)}`;
      const b64 = Buffer.from(attachment.content).toString('base64').replace(/(.{76})/g, '$1\r\n');
      messageParts = [
        ...head,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        bodyHtml,
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType || 'application/pdf'}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        b64,
        `--${boundary}--`,
      ];
    } else {
      messageParts = [...head, 'Content-Type: text/html; charset=utf-8', '', bodyHtml];
    }
    const encodedMessage = Buffer.from(messageParts.join('\r\n'))
      .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
    return { success: true, messageId: res.data.id, from: account.email };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
