import Link from 'next/link';
import { createAdminClient } from '../../../lib/supabase/admin';
import { importProspects, addProspect, updateProspect } from '../actions';
import { STAGES, STAGE_LABEL, STAGE_COLOR } from '../stages';
import { parseNotes } from '../../../lib/prospectNotes';
import { externalUrl, linkedinUrl } from '../../../lib/externalUrl';

export default async function AdminOutboundPage({ searchParams }) {
  const admin = createAdminClient();
  const { data: prospects } = await admin.from('prospects').select('*').order('created_at', { ascending: false });
  const all = prospects || [];

  const activeStatus = searchParams?.status && STAGES.includes(searchParams.status) ? searchParams.status : null;
  const rows = activeStatus ? all.filter(p => p.status === activeStatus) : all;

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Cold DM</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Hand-sourced on LinkedIn and Reddit</p>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 20 }}>
        One prospect at a time, personalised, sent by hand. Separate from the Cold email lane, which runs scraped lists through OutboundOS.
      </p>

      <details style={{ marginBottom: 16 }}>
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Source / add a prospect</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
          <section className="card">
            <div className="tag">Paste a list</div>
            <p style={{ margin: '8px 0 12px', color: 'var(--ink3)', fontSize: 14 }}>One per line: <span className="mono" style={{ fontSize: 12 }}>Company, Website, what they do</span></p>
            <form action={importProspects}>
              <textarea name="list" required placeholder={"Acme Agency, acme.com, cold email for SaaS\nBright Leads, brightleads.io, appointment setting"} style={{ minHeight: 100, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }} />
              <button className="btn" type="submit" style={{ marginTop: 10 }}>Import &rarr;</button>
            </form>
          </section>

          <section className="card">
            <div className="tag">Add one prospect</div>
            <form action={addProspect} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
              <input name="company" placeholder="Company" required style={{ flex: '1 1 160px' }} />
              <input name="contact_name" placeholder="Contact name" style={{ flex: '1 1 140px' }} />
              <input name="website" placeholder="Website" style={{ flex: '1 1 140px' }} />
              <input name="niche" placeholder="What they do" style={{ flex: '1 1 160px' }} />
              <button className="btn" type="submit" style={{ fontSize: 16, padding: '9px 18px' }}>+ Add</button>
            </form>
          </section>
        </div>
      </details>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Link href="/admin/outbound" className="mono" style={{
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none',
          padding: '6px 12px', border: '2px solid var(--ink)', borderRadius: 6,
          color: !activeStatus ? 'var(--paper)' : 'var(--ink)', background: !activeStatus ? 'var(--ink)' : 'transparent',
        }}>
          All &middot; {all.length}
        </Link>
        {STAGES.map(s => (
          <Link key={s} href={`/admin/outbound?status=${s}`} className="mono" style={{
            fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none',
            padding: '6px 12px', border: '2px solid var(--ink)', borderRadius: 6,
            color: activeStatus === s ? 'var(--paper)' : 'var(--ink)', background: activeStatus === s ? 'var(--ink)' : 'transparent',
          }}>
            {STAGE_LABEL[s]} &middot; {all.filter(p => p.status === s).length}
          </Link>
        ))}
      </div>

      {rows.length === 0 && <p style={{ color: 'var(--ink3)' }}>Nothing here.</p>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
              <th style={{ padding: '10px 12px' }}>Company</th>
              <th style={{ padding: '10px 12px' }}>Contact</th>
              <th style={{ padding: '10px 12px' }}>Niche</th>
              <th style={{ padding: '10px 12px' }}>LinkedIn</th>
              <th style={{ padding: '10px 12px', minWidth: 180 }}>Notes</th>
              <th style={{ padding: '10px 12px', minWidth: 220 }}>DM Draft</th>
              <th style={{ padding: '10px 12px', minWidth: 150 }}>Status</th>
              <th style={{ padding: '10px 12px', minWidth: 160 }}>Activity Log</th>
              <th style={{ padding: '10px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const formId = `prospect-${p.id}`;
              const { notes, draft, log } = parseNotes(p.notes);
              return (
                <tr key={p.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', verticalAlign: 'top' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <input type="hidden" name="id" value={p.id} form={formId} />
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{p.company}</div>
                    {externalUrl(p.website) && (
                      <a href={externalUrl(p.website)} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 10, color: 'var(--brick)' }}>{p.website}</a>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', minWidth: 130 }}>
                    <input name="contact_name" placeholder="Contact" defaultValue={p.contact_name || ''} style={{ fontSize: 13, padding: '7px 10px' }} form={formId} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink3)', maxWidth: 160 }}>{p.niche || '—'}</td>
                  <td style={{ padding: '10px 12px', minWidth: 150 }}>
                    {linkedinUrl(p.linkedin) && (
                      <a href={linkedinUrl(p.linkedin)} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--brick)', display: 'inline-block', marginBottom: 4, textDecoration: 'underline' }}>
                        Open profile &#8599;
                      </a>
                    )}
                    <input name="linkedin" placeholder="LinkedIn URL" defaultValue={p.linkedin || ''} style={{ fontSize: 12, padding: '7px 10px' }} form={formId} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <textarea name="notes" placeholder="Notes (reply, next step…)" defaultValue={notes} style={{ fontSize: 13, padding: '7px 10px', minHeight: 44, resize: 'vertical' }} form={formId} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <textarea name="dm_draft" placeholder="Ready-to-send DM" defaultValue={draft} style={{ fontSize: 13, padding: '7px 10px', minHeight: 44, resize: 'vertical', background: draft ? 'rgba(200,150,12,0.08)' : 'transparent' }} form={formId} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select name="status" defaultValue={p.status} style={{ fontSize: 13, padding: '7px 10px', borderColor: STAGE_COLOR[p.status] }} form={formId}>
                      {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--ink3)', whiteSpace: 'pre-wrap', maxWidth: 200 }}>
                    {log || <span style={{ opacity: 0.5 }}>No changes logged yet</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn" type="submit" style={{ fontSize: 13, padding: '7px 14px' }} form={formId}>Save</button>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <form id={formId} action={updateProspect} style={{ display: 'none' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
