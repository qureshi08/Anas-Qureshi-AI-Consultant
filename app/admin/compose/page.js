import { createAdminClient } from '../../../lib/supabase/admin';
import { saveComposedSequence } from '../outbound-actions';
import ColdEmailNav from '../../components/ColdEmailNav';
import ComposeBuilder from '../../components/ComposeBuilder';

export const dynamic = 'force-dynamic';

export default async function ComposePage({ searchParams }) {
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('id, name').order('created_at', { ascending: false });

  const list = campaigns || [];
  const campaignId = searchParams?.campaign || (list[0] ? String(list[0].id) : '');

  let steps = [];
  let sampleLead = null;
  if (campaignId) {
    const { data: s } = await admin
      .from('campaign_steps').select('*').eq('campaign_id', campaignId).order('step_number');
    steps = s || [];
    const { data: l } = await admin
      .from('leads').select('*').eq('campaign_id', campaignId).limit(1);
    sampleLead = l && l[0] ? l[0] : null;
  }

  return (
    <>
      <ColdEmailNav />

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Compose</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        Build the email in four moves, not one blank box
      </p>

      <ComposeBuilder
        campaigns={list}
        initialCampaignId={campaignId}
        steps={steps}
        sampleLead={sampleLead}
        saveAction={saveComposedSequence}
      />
    </>
  );
}
