import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import ColdEmailNav from '../../components/ColdEmailNav';
import SyncRepliesButton from '../../components/SyncRepliesButton';
import { resolveEra, leadDate, inEra, campaignEra } from '../../../lib/era';
import EraTabs from '../../components/EraTabs';

export const dynamic = 'force-dynamic';

export default async function ColdEmailDashboard({ searchParams }) {
  const era = resolveEra(searchParams?.era);
  const admin = createAdminClient();
  const { data: campaigns } = await admin.from('campaigns').select('*').order('created_at', { ascending: false });
  const { data: leads } = await admin.from('leads').select('campaign_id, status, sent_at, created_at');

  const all = (leads || []).filter(l => inEra(era, leadDate(l)));
  const sent = all.filter(l => l.sent_at).length;
  const replied = all.filter(l => l.status === 'replied' || l.status === 'booked').length;
  const booked = all.filter(l => l.status === 'booked').length;
  const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

  const visibleCampaigns = (campaigns || []).filter(c => era === 'all' || campaignEra(c) === (era === 'current' ? 'current' : 'recruiting'));

  const stats = [
    ['Campaigns', visibleCampaigns.length, null],
    ['Total leads', all.length, null],
    ['Emails sent', sent, 'highlight'],
    ['Replies', replied, null],
    ['Reply rate', pct(replied, sent), null],
    ['Booked', booked, null],
    ['Booking rate', pct(booked, sent), 'success'],
  ];

  return (
    <>
      <ColdEmailNav />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Dashboard</h2>
          <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Cold email mission control
          </p>
        </div>
        <SyncRepliesButton />
      </div>

      <EraTabs era={era} basePath="/admin/cold-email" />

      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 30 }}>
        {stats.map(([label, value, kind], i) => (
          <div
            key={i}
            className="card"
            style={{
              flex: '1 1 120px', padding: '14px 16px', textAlign: 'center',
              borderColor: kind === 'highlight' ? 'var(--brick)' : kind === 'success' ? 'var(--forest)' : 'var(--ink)',
              boxShadow: `4px 4px 0 ${kind === 'highlight' ? 'var(--brick)' : kind === 'success' ? 'var(--forest)' : 'var(--ink)'}`,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)' }}>Recent campaigns</h3>
        <Link href="/admin/campaigns" className="mono" style={{ fontSize: 11, color: 'var(--brick)', textDecoration: 'none' }}>All campaigns &rarr;</Link>
      </div>

      {visibleCampaigns.length === 0 && (
        <p style={{ color: 'var(--ink3)' }}>
          No campaigns in this era yet. <Link href="/admin/campaigns" style={{ color: 'var(--brick)' }}>Create one</Link>, write the email in Compose, then add leads.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibleCampaigns.slice(0, 5).map(c => {
          const ls = all.filter(l => l.campaign_id === c.id);
          const cSent = ls.filter(l => l.sent_at).length;
          const cReplied = ls.filter(l => l.status === 'replied' || l.status === 'booked').length;
          return (
            <Link key={c.id} href={`/admin/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ color: 'var(--ink3)', fontSize: 14 }}>{c.goal}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--ink2)' }}>
                    {ls.length} leads &middot; {cSent} sent &middot; {cReplied} replied
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
