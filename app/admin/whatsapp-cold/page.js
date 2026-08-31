import { createAdminClient } from '../../../lib/supabase/admin';
import { updateWhatsappLead } from '../actions';

const STATUSES = ['pending', 'sent', 'replied', 'booked', 'dead'];
const STATUS_LABEL = { pending: 'Pending', sent: 'Sent', replied: 'Replied', booked: 'Booked', dead: 'Dead' };
const STATUS_COLOR = {
  pending: 'var(--ink3)', sent: 'var(--amber)', replied: 'var(--forest)',
  booked: 'var(--forest)', dead: 'var(--ink3)',
};

function waLink(phone) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}`;
}

export default async function WhatsappColdPage({ searchParams }) {
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from('whatsapp_cold_leads')
    .select('*')
    .order('created_at', { ascending: true });
  const all = leads || [];

  const activeStatus = searchParams?.status && STATUSES.includes(searchParams.status) ? searchParams.status : null;
  const rows = activeStatus ? all.filter(l => l.status === activeStatus) : all;

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: all.filter(l => l.status === s).length }), {});

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>WhatsApp cold</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
        Sourced from business WhatsApp links, sent by hand from your personal number
      </p>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 20 }}>
        Separate lane from Cold DM and Cold email &mdash; numbers here come from each business&apos;s own
        published WhatsApp contact link, not a scraped general phone number. Not loaded into{' '}
        <span className="mono">prospects</span> or <span className="mono">leads</span>, keeps the three lanes clean.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <a
          href="/admin/whatsapp-cold"
          className="mono"
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
            padding: '7px 14px', border: '2px solid var(--ink)', borderRadius: 8,
            color: !activeStatus ? 'var(--paper)' : 'var(--ink)',
            background: !activeStatus ? 'var(--ink)' : 'transparent',
          }}
        >
          All &middot; {all.length}
        </a>
        {STATUSES.map(s => (
          <a
            key={s}
            href={`/admin/whatsapp-cold?status=${s}`}
            className="mono"
            style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
              padding: '7px 14px', border: `2px solid ${STATUS_COLOR[s]}`, borderRadius: 8,
              color: activeStatus === s ? 'var(--paper)' : STATUS_COLOR[s],
              background: activeStatus === s ? STATUS_COLOR[s] : 'transparent',
            }}
          >
            {STATUS_LABEL[s]} &middot; {counts[s]}
          </a>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
              <th style={{ padding: '10px 12px', minWidth: 180 }}>Business</th>
              <th style={{ padding: '10px 12px', minWidth: 130 }}>Phone</th>
              <th style={{ padding: '10px 12px', minWidth: 260 }}>Message</th>
              <th style={{ padding: '10px 12px', minWidth: 150 }}>Status</th>
              <th style={{ padding: '10px 12px', minWidth: 160 }}>Notes</th>
              <th style={{ padding: '10px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const formId = `wa-lead-${l.id}`;
              return (
                <tr key={l.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <input type="hidden" name="id" value={l.id} form={formId} />
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{l.company}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase' }}>{l.business_type} &middot; {l.city}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div className="mono" style={{ fontSize: 12, marginBottom: 6 }}>{l.phone}</div>
                    <a href={waLink(l.phone)} target="_blank" rel="noreferrer" className="mono" style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em',
                      color: 'var(--forest)', border: '1.5px solid var(--forest)', borderRadius: 5,
                      padding: '4px 8px', textDecoration: 'none', display: 'inline-block',
                    }}>
                      Open WhatsApp &#8599;
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, maxWidth: 320 }}>{l.message_1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <select name="status" defaultValue={l.status} style={{ fontSize: 13, padding: '7px 10px', borderColor: STATUS_COLOR[l.status] }} form={formId}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <textarea name="notes" placeholder="Reply, next step..." defaultValue={l.notes || ''} style={{ fontSize: 13, padding: '7px 10px', minHeight: 44, resize: 'vertical' }} form={formId} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn" type="submit" style={{ fontSize: 13, padding: '7px 14px' }} form={formId}>Save</button>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <form id={formId} action={updateWhatsappLead} style={{ display: 'none' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: 'var(--ink3)', padding: '20px 0' }}>Nothing here yet.</p>}
      </div>
    </>
  );
}
