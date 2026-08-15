/**
 * Cold email send engine — ported from AI Automations/emailService.js so the
 * whole thing runs inside this Next.js app instead of a separate Express server.
 *
 * Server-only: uses the Supabase service-role client and Gmail credentials.
 * Never import this from a client component.
 */
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { createAdminClient } from '../supabase/admin';
import { getGoogleCreds } from './googleCreds';

async function getGoogleClientCreds() {
  const { clientId, clientSecret } = await getGoogleCreds();
  return { google_client_id: clientId, google_client_secret: clientSecret };
}

export function renderTemplate(template, variables) {
  if (!template) return '';
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (variables[key] !== undefined && variables[key] !== null) return variables[key];
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(variables).find(k => k.toLowerCase() === lowerKey);
    if (foundKey) return variables[foundKey];
    return match;
  });
}

// Pull a city out of scraped Google Maps notes: "8 Pemberton Pl, London E8 3RG, UK" -> "London"
function cityFromLead(lead) {
  try {
    const raw = lead.raw_data ? JSON.parse(lead.raw_data) : {};
    const notes = raw.notes || '';
    const parts = notes.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const cityAndPostcode = parts[parts.length - 2];
      return cityAndPostcode.replace(/\s+[A-Z]{1,2}\d[\d\w]?\s*\d[A-Z]{2}/i, '').trim();
    }
  } catch (_) {}
  return '';
}

export function variablesFor(lead) {
  const firstName = (lead.first_name || '').replace(/^\(unknown\)$/i, '').trim();
  return {
    first_name: firstName || 'there',
    last_name: lead.last_name || '',
    full_name: firstName || lead.company || '',
    email: lead.email,
    company: lead.company || '',
    // Trading suffixes read like a database row in a subject line. Nobody
    // writes "screening at ATL Search Group, LLC" to a person.
    company_short: (lead.company || '')
      .replace(/\([^)]*\)/g, '')
      .replace(/,?\s*(LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Corp\.?|Co\.)\s*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || (lead.company || ''),
    industry: lead.industry || '',
    title: lead.title || '',
    custom_note: lead.custom_note || '',
    city: cityFromLead(lead) || 'your area',
    // The sendable opening line, generated from custom_note by
    // scripts/generate-personal-lines.mjs. custom_note itself is internal
    // research prose and must never be interpolated into a real email.
    //
    // The fallback matters: renderTemplate leaves an unknown {{token}} in the
    // body verbatim, so a missing value would post "{{personal_line}}" to a
    // prospect. It is deliberately honest rather than fake-specific, because a
    // clumsy invented detail is worse than a plain opening.
    personal_line: (lead.notes || '').trim()
      || `I came across ${lead.company || 'your firm'} while looking through independent recruiting firms.`,
  };
}

async function getTransporter(account) {
  if (!account || !account.email) throw new Error('Invalid sending account provided.');

  if (account.refresh_token) {
    const { google_client_id, google_client_secret } = await getGoogleClientCreds();
    if (!google_client_id || !google_client_secret) {
      throw new Error('Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.');
    }
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: account.email,
          clientId: google_client_id,
          clientSecret: google_client_secret,
          refreshToken: account.refresh_token,
        },
      }),
      from: `${account.sender_name || 'Anas Qureshi'} <${account.email}>`,
    };
  }

  if (!account.app_password) throw new Error('No app password or OAuth token for this inbox.');
  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user: account.email, pass: account.app_password },
    }),
    from: `${account.sender_name || 'Anas Qureshi'} <${account.email}>`,
  };
}

/**
 * Send one email and record it. Deliberately single-message: each call finishes
 * fast enough to live inside a serverless function. Pacing is the caller's job.
 */
export async function sendEmail({ campaignId, leadId, to, subject, body, account, replyToId }) {
  if (!account) throw new Error('No sending account provided');
  const admin = createAdminClient();

  const { data: sigRow } = await admin
    .from('settings').select('value').eq('key', 'email_signature').maybeSingle();
  const signature = sigRow ? sigRow.value : '';
  const fullBodyHtml = (body + (signature ? `<br><br>${signature}` : '')).replace(/\n/g, '<br>');

  try {
    let messageId;

    if (account.refresh_token) {
      // Gmail API — keeps a copy in the Sent folder, which SMTP does not.
      const { google_client_id, google_client_secret } = await getGoogleClientCreds();
      const oauth2Client = new google.auth.OAuth2(google_client_id, google_client_secret);
      oauth2Client.setCredentials({ refresh_token: account.refresh_token });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `From: ${account.sender_name || 'Anas Qureshi'} <${account.email}>`,
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        ...(replyToId ? [`In-Reply-To: ${replyToId}`, `References: ${replyToId}`] : []),
        '',
        fullBodyHtml,
      ];
      const encodedMessage = Buffer.from(messageParts.join('\n'))
        .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me', requestBody: { raw: encodedMessage },
      });
      messageId = res.data.id;
    } else {
      const { transporter, from } = await getTransporter(account);
      const info = await transporter.sendMail({
        from, to, subject, html: fullBodyHtml,
        headers: replyToId ? { 'In-Reply-To': replyToId, References: replyToId } : {},
      });
      messageId = info.messageId;
    }

    const now = new Date().toISOString();
    await admin.from('email_logs').insert({
      campaign_id: campaignId, lead_id: leadId, sending_account_id: account.id,
      subject, body, status: 'sent', sent_at: now,
    });
    await admin.from('leads').update({
      status: 'sent', sent_at: now, last_message_id: messageId,
    }).eq('id', leadId);

    return { success: true, messageId };
  } catch (error) {
    const now = new Date().toISOString();
    await admin.from('email_logs').insert({
      campaign_id: campaignId, lead_id: leadId, sending_account_id: account.id,
      subject, body, status: 'failed', error: error.message, sent_at: now,
    });
    return { success: false, error: error.message };
  }
}
