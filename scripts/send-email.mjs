/**
 * Send ONE job application or founder email from Anas's own Gmail (muhammadanasq@gmail.com),
 * with a resume attached, then mark the job row applied. Lets Claude send emails directly from
 * the chat (Anas, 2026-11-16: "the things that can be done automatically, should happen
 * automatically"), same Gmail connection as the one click button in /admin (lib/jobs/mailSender.js).
 *
 *   node Website/scripts/send-email.mjs --to x@y.com --subject "..." --body-file body.txt \
 *     --attach "Jobs/resume/Anas_Qureshi_Forward_Deployed_Engineer.pdf" [--job-id <uuid>] [--dry]
 *
 * Needs in Website/.env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE,
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (the same OAuth client as on Vercel). The refresh token
 * comes from the sending_accounts row; if Google says invalid_grant, reconnect the inbox at
 * /admin/inboxes (tokens expire every 7 days while the OAuth app is in testing).
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
for (const f of ['.env.local', '.env.development.local']) {
  const p = path.join(here, '..', f);
  if (!fs.existsSync(p)) continue;
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
const to = arg('to'), subject = arg('subject'), bodyFile = arg('body-file'), attach = arg('attach'), jobId = arg('job-id');
const dry = process.argv.includes('--dry');
const SENDER = 'muhammadanasq@gmail.com';

if (!to || !subject || !bodyFile) { console.log('Usage: --to --subject --body-file [--attach] [--job-id] [--dry]'); process.exit(1); }
const body = fs.readFileSync(path.isAbsolute(bodyFile) ? bodyFile : path.join(root, bodyFile), 'utf8').trim();
if (!body) { console.log('Body is empty, not sent.'); process.exit(1); }
if (/[–—]/.test(body + subject) && !/—\s*Kreative Media/.test(subject)) console.log('WARNING: a dash character is in the text.');

let attachment = null;
if (attach) {
  const p = path.isAbsolute(attach) ? attach : path.join(root, attach);
  if (!fs.existsSync(p)) { console.log(`Attachment not found: ${p}`); process.exit(1); }
  attachment = { filename: path.basename(p), content: fs.readFileSync(p) };
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
const { data: account } = await db.from('sending_accounts').select('*').eq('email', SENDER).eq('active', 1).maybeSingle();
if (!account || !account.refresh_token) { console.log(`Inbox ${SENDER} is not connected. Reconnect it at /admin/inboxes.`); process.exit(1); }
const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim(), clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
if (!clientId || !clientSecret) { console.log('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing from Website/.env.local (copy them from Vercel, Settings, Environment Variables).'); process.exit(1); }

const bodyHtml = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
const head = [`From: ${account.sender_name || 'Anas Qureshi'} <${account.email}>`, `To: ${to}`, 'MIME-Version: 1.0', `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`];
let parts;
if (attachment) {
  const b = `mixed_${Date.now().toString(36)}`;
  parts = [...head, `Content-Type: multipart/mixed; boundary="${b}"`, '', `--${b}`, 'Content-Type: text/html; charset=utf-8', '', bodyHtml,
    `--${b}`, `Content-Type: application/pdf; name="${attachment.filename}"`, `Content-Disposition: attachment; filename="${attachment.filename}"`, 'Content-Transfer-Encoding: base64', '',
    attachment.content.toString('base64').replace(/(.{76})/g, '$1\r\n'), `--${b}--`];
} else parts = [...head, 'Content-Type: text/html; charset=utf-8', '', bodyHtml];

if (dry) { console.log(`DRY RUN. Would send to ${to}, subject "${subject}", attachment ${attachment ? attachment.filename : 'none'}.\n\n${body}`); process.exit(0); }

const auth = new google.auth.OAuth2(clientId, clientSecret);
auth.setCredentials({ refresh_token: account.refresh_token });
const gmail = google.gmail({ version: 'v1', auth });
try {
  const raw = Buffer.from(parts.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  console.log(`SENT to ${to} from ${account.email}, Gmail id ${res.data.id}`);
} catch (e) {
  console.log(`SEND FAILED: ${e.message}${/invalid_grant/.test(e.message) ? ' (token expired: reconnect the inbox at /admin/inboxes)' : ''}`);
  process.exit(1);
}

if (jobId) {
  const now = new Date().toISOString();
  const { data: job } = await db.from('job_leads').select('notes').eq('id', jobId).maybeSingle();
  await db.from('job_leads').update({
    status: 'applied', applied_at: now, contact_email: to, email_subject: subject, email_body: body,
    resume_variant: attachment ? attachment.filename : null,
    notes: `${job?.notes || ''}\n[${now.slice(0, 16)}] Email SENT by Claude from chat via Gmail API to ${to}${attachment ? ', ' + attachment.filename + ' attached' : ''}.`,
    updated_at: now,
  }).eq('id', jobId);
  console.log(`Job ${jobId} marked applied.`);
}
