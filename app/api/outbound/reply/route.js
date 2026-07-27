import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { sendEmail } from '../../../../lib/outbound/emailService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Reply by hand to someone who wrote back, on the same thread. */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId, body } = await request.json();
  if (!leadId || !body) return NextResponse.json({ error: 'leadId and body required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: lead } = await admin.from('leads').select('*').eq('id', leadId).single();
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Prefer the inbox that originally emailed them so the thread stays intact.
  const { data: lastLog } = await admin
    .from('email_logs').select('sending_account_id')
    .eq('lead_id', leadId).eq('status', 'sent')
    .order('sent_at', { ascending: false }).limit(1).maybeSingle();

  let account = null;
  if (lastLog?.sending_account_id) {
    const { data: a } = await admin.from('sending_accounts').select('*').eq('id', lastLog.sending_account_id).maybeSingle();
    account = a;
  }
  if (!account) {
    const { data: accounts } = await admin.from('sending_accounts').select('*').eq('active', 1).limit(1);
    account = accounts && accounts[0];
  }
  if (!account) return NextResponse.json({ error: 'No active inbox to send from.' }, { status: 400 });

  const result = await sendEmail({
    campaignId: lead.campaign_id,
    leadId: lead.id,
    to: lead.email,
    subject: 'Re: your reply',
    body,
    account,
    replyToId: lead.last_message_id,
  });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true, to: lead.email, via: account.email });
}
