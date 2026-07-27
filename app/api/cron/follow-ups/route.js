/**
 * Daily follow-up pass. Vercel Cron hits this once a day (Hobby plan allows
 * exactly that), which is plenty: follow-up delays are measured in days, so
 * checking hourly would buy nothing.
 *
 * For each lead that was sent to and hasn't replied, if enough days have passed
 * it sends the next step in the sequence as a reply on the same thread.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { sendEmail, renderTemplate, variablesFor } from '../../../../lib/outbound/emailService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel sets this header on cron invocations; CRON_SECRET is the shared secret.
function authorised(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: leads } = await admin
    .from('leads')
    .select('*, campaigns(name)')
    .eq('status', 'sent')
    .not('last_message_id', 'is', null)
    .limit(200);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 });
  }

  const { data: accounts } = await admin
    .from('sending_accounts').select('*').eq('active', 1).order('id');
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ ok: true, checked: leads.length, sent: 0, note: 'No active inbox.' });
  }

  // Respect daily limits here too, so follow-ups can't blow past them.
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: todaysLogs } = await admin
    .from('email_logs').select('sending_account_id')
    .eq('status', 'sent').gte('sent_at', startOfDay.toISOString());
  const sentToday = {};
  (todaysLogs || []).forEach(l => { sentToday[l.sending_account_id] = (sentToday[l.sending_account_id] || 0) + 1; });

  let sentCount = 0;
  let accountIndex = 0;

  for (const lead of leads) {
    const nextStepNumber = (lead.current_step || 1) + 1;
    const { data: step } = await admin
      .from('campaign_steps').select('*')
      .eq('campaign_id', lead.campaign_id)
      .eq('step_number', nextStepNumber)
      .maybeSingle();
    if (!step) continue;

    // Has the delay elapsed?
    const sentAt = lead.sent_at ? new Date(lead.sent_at) : null;
    if (!sentAt) continue;
    const daysSince = (Date.now() - sentAt.getTime()) / 86400000;
    if (daysSince < (step.delay_days || 3)) continue;

    // Find an inbox with headroom.
    let account = null;
    for (let i = 0; i < accounts.length; i++) {
      const candidate = accounts[(accountIndex + i) % accounts.length];
      if ((sentToday[candidate.id] || 0) < (candidate.daily_limit || 50)) {
        account = candidate;
        accountIndex = (accountIndex + i + 1) % accounts.length;
        break;
      }
    }
    if (!account) break; // everything is capped for today

    const variables = variablesFor(lead);
    const campaignName = lead.campaigns ? lead.campaigns.name : '';
    const subject = step.subject_template
      ? renderTemplate(step.subject_template, variables)
      : `Re: ${campaignName}`;
    const body = renderTemplate(step.body_template, variables);

    const result = await sendEmail({
      campaignId: lead.campaign_id,
      leadId: lead.id,
      to: lead.email,
      subject,
      body,
      account,
      replyToId: lead.last_message_id,
    });

    if (result.success) {
      sentToday[account.id] = (sentToday[account.id] || 0) + 1;
      sentCount++;
      await admin.from('leads')
        .update({ current_step: nextStepNumber, sent_at: new Date().toISOString() })
        .eq('id', lead.id);
    }
  }

  return NextResponse.json({ ok: true, checked: leads.length, sent: sentCount });
}
