/**
 * Reply sync via the Gmail API. Scans every connected inbox for replies from
 * people we've emailed, marks them replied (or booked if the subject looks like
 * a calendar accept), and stores the reply body so it shows up in the log.
 *
 * Only works for OAuth-connected inboxes. App-password inboxes can send but
 * cannot be read, which is one of the reasons OAuth is the better option.
 */
import { google } from 'googleapis';
import { createAdminClient } from '../supabase/admin';
import { getGoogleCreds } from './googleCreds';

async function getOAuthClient(refreshToken) {
  const { clientId, clientSecret } = await getGoogleCreds();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel.');
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function headerValue(payload, name) {
  const h = ((payload && payload.headers) || [])
    .find(x => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

// An out-of-office is not a reply. It comes from the lead's own address, so
// the matching below would otherwise mark them 'replied' and inflate the only
// number that matters. Headers first (RFC 3834 and the vendor equivalents are
// far more reliable than text matching), subject patterns as the fallback for
// auto-responders that set no headers at all.
const AUTO_SUBJECT = new RegExp([
  'out of (the )?office', 'automatic(al)? repl(y|ies)', 'auto[- ]?repl(y|ies)',
  'auto[- ]?response', 'autoresponder', 'away from (the )?office', 'away from my desk',
  'on (annual |parental |sick )?leave', 'on vacation', 'on holiday', 'maternity leave',
  'paternity leave', 'no longer (with|at) ', 'has left the (company|business|firm)',
  // non-English auto-responders seen in EU and Gulf sending
  'abwesenheit', 'abwesend', 'automatische antwort', 'r[ée]ponse automatique',
  'absence du bureau', 'fuori sede', 'risposta automatica', 'ausencia',
  'respuesta autom[áa]tica', 'automatisch antwoord', 'afwezig',
].join('|'), 'i');

function isAutoReply(payload, subject) {
  const h = (name) => headerValue(payload, name).toLowerCase();

  // RFC 3834 and the common vendor headers. 'auto-replied' and 'auto-generated'
  // are the standard values; anything other than 'no' means a machine sent it.
  const autoSubmitted = h('auto-submitted');
  if (autoSubmitted && autoSubmitted !== 'no') return true;
  if (h('x-autoreply') || h('x-autorespond') || h('x-autoreply-from')) return true;
  if (h('x-auto-response-suppress')) return true;            // Microsoft/Exchange
  if (/^(auto_reply|bulk|junk|list)$/.test(h('precedence'))) return true;
  if (h('return-path') === '<>') return true;                // null sender, per RFC 3834
  if (h('x-mailer').includes('vacation')) return true;

  return AUTO_SUBJECT.test(subject || '');
}

function extractBody(payload) {
  if (!payload) return '';
  const decode = d => Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  if (payload.body && payload.body.data) return decode(payload.body.data);
  if (payload.parts) {
    const plain = payload.parts.find(p => p.mimeType === 'text/plain' && p.body && p.body.data);
    if (plain) return decode(plain.body.data);
    for (const p of payload.parts) {
      const nested = extractBody(p);
      if (nested) return nested;
    }
  }
  return '';
}

export async function scanForReplies() {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from('sending_accounts').select('*')
    .eq('active', 1).not('refresh_token', 'is', null).neq('refresh_token', '');

  if (!accounts || accounts.length === 0) {
    return {
      success: false,
      repliedCount: 0, bookedCount: 0,
      message: 'No Google-connected inbox. Reply sync needs OAuth, app passwords cannot read mail.',
    };
  }

  const { data: leads } = await admin
    .from('leads').select('id, email, campaign_id, status').in('status', ['sent', 'replied']);
  if (!leads || leads.length === 0) {
    return { success: true, repliedCount: 0, bookedCount: 0, message: 'No sent leads to check yet.' };
  }

  const leadByEmail = new Map();
  for (const l of leads) leadByEmail.set((l.email || '').toLowerCase(), l);

  let repliedCount = 0;
  let bookedCount = 0;
  let bouncedCount = 0;
  let autoReplyCount = 0;
  const errors = [];

  for (const account of accounts) {
    try {
      const auth = await getOAuthClient(account.refresh_token);
      const gmail = google.gmail({ version: 'v1', auth });

      const list = await gmail.users.messages.list({
        userId: 'me', q: 'in:inbox newer_than:30d', maxResults: 100,
      });

      for (const m of list.data.messages || []) {
        const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const payload = full.data.payload;
        const fromRaw = headerValue(payload, 'From').toLowerCase();
        const subject = headerValue(payload, 'Subject') || '';
        const subjLower = subject.toLowerCase();

        // Bounce notices come from mailer-daemon/postmaster, not from the
        // lead's own address, so they'd never match the reply-matching logic
        // below at all. The bounced recipient's address is in the notice's
        // body text, not the From header, so search there instead.
        const isBounceNotice = /mailer-daemon|postmaster|mail delivery (subsystem|system)/.test(fromRaw)
          || /delivery status notification|undelivered mail|mail delivery failed|returned mail/.test(subjLower);
        if (isBounceNotice) {
          const bounceBody = (extractBody(payload) || '').toLowerCase();
          for (const [email, lead] of leadByEmail) {
            if (email && lead.status === 'sent' && bounceBody.includes(email)) {
              await admin.from('leads').update({ status: 'bounced' }).eq('id', lead.id);
              bouncedCount++;
              lead.status = 'bounced';
              break;
            }
          }
          continue;
        }

        let matched = null;
        for (const [email, lead] of leadByEmail) {
          if (email && fromRaw.includes(email)) { matched = lead; break; }
        }
        if (!matched) continue;

        const now = new Date().toISOString();

        // Log the auto-reply so it's visible, but leave the lead on 'sent'.
        // Deliberate: an out-of-office is not a rejection, so the sequencer
        // (which only picks up status 'sent') should keep following up once
        // they're back. Leaving the status alone also keeps every reply count
        // in the admin correct without teaching six other pages a new status.
        if (isAutoReply(payload, subject)) {
          const { data: already } = await admin
            .from('email_logs').select('id')
            .eq('lead_id', matched.id).eq('status', 'auto_reply').eq('subject', subject)
            .limit(1);
          if (!already || already.length === 0) {
            await admin.from('email_logs').insert({
              campaign_id: matched.campaign_id, lead_id: matched.id,
              sending_account_id: account.id, subject,
              body: (extractBody(payload) || '').substring(0, 1000),
              status: 'auto_reply', sent_at: now,
            });
            autoReplyCount++;
          }
          continue;
        }

        const isBooking = /accepted:|confirmed:|scheduled:|invitation:/.test(subjLower);

        if (isBooking && matched.status !== 'booked') {
          await admin.from('leads').update({ status: 'booked', booked_at: now }).eq('id', matched.id);
          bookedCount++;
          matched.status = 'booked';
        } else if (!isBooking && matched.status === 'sent') {
          const bodyText = (extractBody(payload) || '').substring(0, 1000);
          await admin.from('leads').update({ status: 'replied', replied_at: now }).eq('id', matched.id);
          await admin.from('email_logs').insert({
            campaign_id: matched.campaign_id, lead_id: matched.id,
            sending_account_id: account.id, subject, body: bodyText,
            status: 'received', sent_at: now,
          });
          repliedCount++;
          matched.status = 'replied';
        }
      }
    } catch (err) {
      errors.push(`${account.email}: ${err.message}`);
    }
  }

  const parts = [];
  if (repliedCount) parts.push(`${repliedCount} new ${repliedCount === 1 ? 'reply' : 'replies'}`);
  if (bookedCount) parts.push(`${bookedCount} booked`);
  if (bouncedCount) parts.push(`${bouncedCount} bounced`);
  if (autoReplyCount) parts.push(`${autoReplyCount} auto-reply, not counted as a reply`);
  let message = parts.length ? `Found ${parts.join(', ')}.` : 'Nothing new since last check.';
  if (errors.length) message += ` (${errors.length} inbox had errors)`;

  return { success: true, repliedCount, bookedCount, bouncedCount, autoReplyCount, message, errors: errors.length ? errors : undefined };
}
