import Link from 'next/link';
import { createAdminClient } from '../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

const STAGES = ['new', 'connected', 'replied', 'call', 'won', 'lost'];
const STAGE_LABEL = { new: 'New', connected: 'Connected', replied: 'Replied', call: 'Call', won: 'Won', lost: 'Lost' };

export default async function AdminOverviewPage() {
  const admin = createAdminClient();
  const { data: prospects } = await admin.from('prospects').select('status');
  const { data: bookings } = await admin.from('bookings').select('status');
  const { data: inbound } = await admin.from('inbound_leads').select('id');
  const { data: conversations } = await admin.from('conversations').select('id, email');
  const { data: emailLeads } = await admin.from('leads').select('id');

  const ps = prospects || [];
  const stageCount = (s) => ps.filter(p => p.status === s).length;
  const requestedCalls = (bookings || []).filter(b => b.status === 'requested').length;
  const chatLeads = (conversations || []).filter(c => c.email).length;

  return (
    <>
      <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        {[['Prospects', ps.length], ...STAGES.map(s => [STAGE_LABEL[s], stageCount(s)])].map(([lbl, val], i) => (
          <div key={i} className="card" style={{ flex: '1 1 110px', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 34, color: 'var(--ink)', lineHeight: 1 }}>{val}</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', marginTop: 4 }}>{lbl}</div>
          </div>
        ))}
      </section>

      <Link href="/admin/calls" style={{ textDecoration: 'none' }}>
        <div className="card" style={{ marginBottom: 28, borderColor: requestedCalls > 0 ? 'var(--brick)' : 'var(--ink)', boxShadow: requestedCalls > 0 ? '4px 4px 0 var(--brick)' : '4px 4px 0 var(--ink)' }}>
          <div className="tag">Call requests</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{requestedCalls} waiting</div>
          <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>The hottest thing in the funnel. Confirm times by email.</p>
        </div>
      </Link>

      <div className="tag" style={{ marginBottom: 10 }}>The three lead lanes &middot; kept separate on purpose</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Link href="/admin/outbound" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">1 &middot; Cold DM</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{stageCount('new')} untouched</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              Hand-sourced on LinkedIn and Reddit, personalised one at a time. {ps.length} total.
            </p>
          </div>
        </Link>

        <Link href="/admin/campaigns" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">2 &middot; Cold email</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{(emailLeads || []).length} leads</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              Scraped from Google Maps, sent in bulk by OutboundOS.
            </p>
          </div>
        </Link>

        <Link href="/admin/inbound" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="tag">3 &middot; Inbound</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: 'var(--ink)', marginTop: 6 }}>{(inbound || []).length} total</div>
            <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6 }}>
              They came to you. Plus {chatLeads} email-verified from the AI assistant.
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}
