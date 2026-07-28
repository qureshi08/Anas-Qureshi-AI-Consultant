/**
 * Follow-up sequencer. Shared by the daily cron and the manual
 * "Process follow-ups" button, so both behave identically.
 */
import { createAdminClient } from '../supabase/admin';
import { sendEmail, renderTemplate, variablesFor } from './emailService';

export async function processFollowUps({ limit = 200 } = {}) {
  const admin = createAdminClient();

  const { data: leads } = await admin
    .from('leads')
    .select('*, campaigns(name)')
    .eq('status', 'sent')
    .not('last_message_id', 'is', null)
    .limit(limit);

  if (!leads || leads.length === 0) {
    return { ok: true, checked: 0, sent: 0, message: 'Nothing waiting on a follow-up.' };
  }

  const { data: accounts } = await admin
    .from('sending_accounts').select('*').eq('active', 1).order('id');
  if (!accounts || accounts.length === 0) {
    return { ok: false, checked: leads.length, sent: 0, message: 'No active inbox to send from.' };
  }

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: todaysLogs } = await admin
    .from('email_logs').select('sending_account_id')
    .eq('status', 'sent').gte('sent_at', startOfDay.toISOString());
  const sentToday = {};
  (todaysLogs || []).forEach(l => { sentToday[l.sending_account_id] = (sentToday[l.sending_account_id] || 0) + 1; });

  let sentCount = 0;
  let capped = false;

  // Least-used-first, same as the main send loop, so follow-ups spread across
  // every inbox instead of hammering one.
  const pickAccount = () => accounts
    .filter(a => (sentToday[a.id] || 0) < (a.daily_limit || 50))
    .sort((a, b) => (sentToday[a.id] || 0) - (sentToday[b.id] || 0))[0] || null;

  for (const lead of leads) {
    const nextStepNumber = (lead.current_step || 1) + 1;
    const { data: step } = await admin
      .from('campaign_steps').select('*')
      .eq('campaign_id', lead.campaign_id).eq('step_number', nextStepNumber).maybeSingle();
    if (!step) continue;

    const sentAt = lead.sent_at ? new Date(lead.sent_at) : null;
    if (!sentAt) continue;
    if ((Date.now() - sentAt.getTime()) / 86400000 < (step.delay_days || 3)) continue;

    const account = pickAccount();
    if (!account) { capped = true; break; }

    const variables = variablesFor(lead);
    const campaignName = lead.campaigns ? lead.campaigns.name : '';
    const subject = step.subject_template
      ? renderTemplate(step.subject_template, variables)
      : `Re: ${campaignName}`;

    const result = await sendEmail({
      campaignId: lead.campaign_id, leadId: lead.id, to: lead.email,
      subject, body: renderTemplate(step.body_template, variables),
      account, replyToId: lead.last_message_id,
    });

    if (result.success) {
      sentToday[account.id] = (sentToday[account.id] || 0) + 1;
      sentCount++;
      await admin.from('leads')
        .update({ current_step: nextStepNumber, sent_at: new Date().toISOString() })
        .eq('id', lead.id);
    }
  }

  const message = sentCount
    ? `Sent ${sentCount} follow-up${sentCount === 1 ? '' : 's'}.${capped ? ' Stopped early, daily limits reached.' : ''}`
    : capped ? 'Daily limits already reached.' : 'Nothing was due yet.';

  return { ok: true, checked: leads.length, sent: sentCount, message };
}
