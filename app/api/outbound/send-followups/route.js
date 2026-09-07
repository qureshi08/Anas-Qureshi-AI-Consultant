/**
 * Sends the hand written follow-ups for a campaign, on the original thread.
 *
 * Leads that went out with their own fully personalized first email (the
 * 2026-08-17 rule) are skipped by the generic sequencer on purpose, so their
 * follow-up has to be written by hand too. That draft lives on the lead row in
 * raw_data as followup_subject and followup_body, and this route is the only
 * thing that sends it: one batch per click, threaded with In-Reply-To, then
 * followup_sent_at is stamped so nothing goes twice.
 *
 * Batches are small because Vercel caps a request at 60 seconds and every
 * Gmail send takes a second or two. Click again until the count reads zero.
 */
import { NextResponse } from 'next/server';
import { getAdminUser } from '../../../../lib/requireAdmin';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { sendEmail } from '../../../../lib/outbound/emailService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH = 12;

function parseRaw(lead) {
  if (!lead.raw_data) return null;
  try { return JSON.parse(lead.raw_data); } catch (_) { return null; }
}

export async function POST(request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaignId } = await request.json();
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: leads } = await admin
    .from('leads').select('*')
    .eq('campaign_id', campaignId).eq('status', 'sent')
    .not('last_message_id', 'is', null)
    .order('id', { ascending: true });

  const due = (leads || []).filter(l => {
    const raw = parseRaw(l);
    return raw && raw.followup_subject && raw.followup_body && !raw.followup_sent_at;
  });

  if (due.length === 0) {
    return NextResponse.json({ success: true, sent: 0, remaining: 0, message: 'No drafted follow-ups waiting.' });
  }

  const { data: accounts } = await admin
    .from('sending_accounts').select('*').eq('active', 1).order('id', { ascending: true });
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'No active sending inbox. Add one under Inboxes.' }, { status: 400 });
  }

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: todaysLogs } = await admin
    .from('email_logs').select('sending_account_id')
    .eq('status', 'sent').gte('sent_at', startOfDay.toISOString());
  const sentToday = {};
  (todaysLogs || []).forEach(l => { sentToday[l.sending_account_id] = (sentToday[l.sending_account_id] || 0) + 1; });

  // The inbox that sent the first email, so the reply lands in the same thread
  // on their side; any other inbox with room if that one is at its limit.
  const { data: firstLogs } = await admin
    .from('email_logs').select('lead_id, sending_account_id')
    .in('lead_id', due.map(l => l.id)).eq('status', 'sent').order('sent_at', { ascending: true });
  const firstInbox = {};
  (firstLogs || []).forEach(l => { if (!firstInbox[l.lead_id]) firstInbox[l.lead_id] = l.sending_account_id; });

  const hasRoom = a => (sentToday[a.id] || 0) < (a.daily_limit || 50);
  const pickAccount = leadId => {
    const own = accounts.find(a => a.id === firstInbox[leadId]);
    if (own && hasRoom(own)) return own;
    return accounts.filter(hasRoom).sort((a, b) => (sentToday[a.id] || 0) - (sentToday[b.id] || 0))[0] || null;
  };

  let sent = 0;
  let failed = 0;
  let capped = false;
  for (const lead of due.slice(0, BATCH)) {
    const account = pickAccount(lead.id);
    if (!account) { capped = true; break; }
    const raw = parseRaw(lead);

    const result = await sendEmail({
      campaignId, leadId: lead.id, to: lead.email,
      subject: raw.followup_subject, body: raw.followup_body,
      account, replyToId: lead.last_message_id,
    });

    if (result.success) {
      sent++;
      sentToday[account.id] = (sentToday[account.id] || 0) + 1;
      raw.followup_sent_at = new Date().toISOString();
      await admin.from('leads')
        .update({ current_step: (lead.current_step || 1) + 1, raw_data: JSON.stringify(raw) })
        .eq('id', lead.id);
    } else {
      failed++;
    }
  }

  const remaining = due.length - sent - failed;
  const parts = [`Sent ${sent} follow-up${sent === 1 ? '' : 's'}.`];
  if (failed) parts.push(`${failed} failed, see the log below.`);
  if (capped) parts.push('Stopped early, every inbox is at its daily limit.');
  else if (remaining > 0) parts.push(`${remaining} still waiting, click again.`);
  else parts.push('All done.');

  return NextResponse.json({ success: failed === 0, sent, failed, remaining, message: parts.join(' ') });
}
