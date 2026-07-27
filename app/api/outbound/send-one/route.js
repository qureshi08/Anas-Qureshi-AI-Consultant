/**
 * Sends exactly ONE email per request, then returns.
 *
 * This is the whole trick that lets cold email run on Vercel: instead of a
 * long-lived loop that a serverless host would kill, the admin page calls this
 * repeatedly and does the waiting itself. One call = one message = a couple of
 * seconds, comfortably inside the function timeout.
 *
 * Returns { done: true } when the campaign has no eligible leads left.
 */
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { sendEmail, renderTemplate, variablesFor } from '../../../../lib/outbound/emailService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  // Same auth as the rest of /admin — this endpoint can spend money and send
  // mail in your name, so it is never public.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { campaignId, safetyFilter = 'SAFE_RISKY' } = await request.json();
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const admin = createAdminClient();

  const { data: campaign } = await admin.from('campaigns').select('*').eq('id', campaignId).single();
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (!campaign.subject_template || !campaign.body_template) {
    return NextResponse.json({ error: 'This campaign has no email written yet. Add step 1 first.' }, { status: 400 });
  }

  // Pick the next eligible lead.
  let q = admin.from('leads').select('*').eq('campaign_id', campaignId).eq('status', 'pending');
  if (safetyFilter === 'SAFE_ONLY') {
    q = q.eq('validation_status', 'SAFE');
  } else if (safetyFilter === 'SAFE_RISKY') {
    q = q.in('validation_status', ['SAFE', 'RISKY', 'ACCEPT_ALL']);
  } else {
    q = q.neq('validation_status', 'INVALID');
  }
  const { data: leads } = await q.order('id', { ascending: true }).limit(1);

  if (!leads || leads.length === 0) {
    await admin.from('campaigns')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    return NextResponse.json({ done: true, message: 'No eligible leads left.' });
  }
  const lead = leads[0];

  // Round-robin across active inboxes, respecting each one's daily limit.
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
  (todaysLogs || []).forEach(l => {
    sentToday[l.sending_account_id] = (sentToday[l.sending_account_id] || 0) + 1;
  });

  const account = accounts.find(a => (sentToday[a.id] || 0) < (a.daily_limit || 50));
  if (!account) {
    return NextResponse.json({
      done: true,
      message: 'Every inbox has hit its daily limit. Pick this back up tomorrow.',
    });
  }

  const variables = variablesFor(lead);
  const subject = renderTemplate(campaign.subject_template, variables);
  const body = renderTemplate(campaign.body_template, variables);

  const result = await sendEmail({
    campaignId, leadId: lead.id, to: lead.email, subject, body, account,
  });

  await admin.from('campaigns')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', campaignId);

  return NextResponse.json({
    done: false,
    sent: result.success,
    to: lead.email,
    via: account.email,
    error: result.error || null,
  });
}
