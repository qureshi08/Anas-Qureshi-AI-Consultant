import { createAdminClient } from '../../../lib/supabase/admin';
import CopyButton from '../../components/CopyButton';
import { sendPitchNow, setPitchStatus, savePitchEmail } from '../pitch-actions';

/**
 * Founder video pitches (2026-09-25): 5 a day. Each row is a tech company with a custom
 * explainer video of its own product, rendered locally by Animations/_founder and uploaded to
 * storage. Watch it, then send. Views come from the public /v/<slug> page.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const card = { border: '2px solid var(--ink)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--paper)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '7px 12px', border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const go = { ...btn, background: 'var(--forest)', color: 'var(--paper)', boxShadow: '2px 2px 0 var(--ink)' };
const SITE = 'https://anas-qureshi-ai-consultant.vercel.app';
const GOAL = 5;

export default async function Pitches() {
  const admin = createAdminClient();
  const { data } = await admin.from('video_pitches').select('*').order('created_at', { ascending: false }).limit(300);
  const rows = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = rows.filter(r => r.sent_at && r.sent_at.slice(0, 10) === today).length;
  const ready = rows.filter(r => r.status === 'ready');
  const waiting = rows.filter(r => ['new', 'rendering'].includes(r.status)).length;
  const sent = rows.filter(r => ['sent', 'viewed', 'replied'].includes(r.status));
  const watched = sent.filter(r => (r.views || 0) > 0).length;
  const due = sent.filter(r => r.status !== 'replied' && r.next_followup && r.next_followup <= today);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: 0 }}>Founder videos sent today: {sentToday} of {GOAL}</h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase' }}>
          {ready.length} ready &middot; {waiting} to render &middot; {sent.length} sent &middot; {watched} watched
        </span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 16px' }}>
        Each video is rendered on your computer (Animations/_founder, run daily.mjs) and appears here when ready. Watch it first, then send. The email links to your page /v/company, which records when they watch.
      </p>

      {!ready.length && (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>No videos ready.</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)' }}>Ask Claude to "run the founder videos" to render today's 5.</div>
        </div>
      )}

      {ready.map(p => (
        <div key={p.id} style={card}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {p.video_url && <video src={p.video_url} poster={p.poster_url || undefined} controls preload="none" style={{ width: 180, aspectRatio: '9 / 16', borderRadius: 10, background: '#000' }} />}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{p.company}</div>
              <a href={p.website} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>{p.website}</a>
              <div style={{ fontSize: 13, margin: '4px 0' }}>{p.one_liner}</div>
              <div style={{ fontSize: 13, margin: '6px 0' }}>
                To: <strong>{p.contact_name || 'no name'}</strong> {p.contact_email ? `<${p.contact_email}>` : '(no email found)'}
                {p.other_emails && <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>Other addresses: {p.other_emails}</div>}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45, background: 'rgba(26,18,5,0.03)', padding: '8px 10px', borderRadius: 6, margin: '6px 0' }}>
                <strong>{p.email_subject}</strong>{'\n\n'}{p.email_body}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {p.contact_email
                  ? <form action={sendPitchNow}><input type="hidden" name="id" value={p.id} /><button type="submit" style={go}>Send email now &rarr;</button></form>
                  : <form action={savePitchEmail} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="id" value={p.id} /><input name="contact_email" type="email" placeholder="paste founder email" style={{ fontSize: 13, padding: '6px 8px' }} /><button type="submit" style={btn}>Save</button></form>}
                <a href={`${SITE}/v/${p.slug}`} target="_blank" rel="noreferrer" style={btn}>Open their page &#8599;</a>
                <CopyButton text={`${SITE}/v/${p.slug}`} label="Copy link" />
                {p.dm_text && <CopyButton text={p.dm_text} label="Copy LinkedIn note" />}
                {(p.founders || [])[0]?.linkedin && <a href={p.founders[0].linkedin} target="_blank" rel="noreferrer" style={btn}>Founder LinkedIn &#8599;</a>}
                <form action={setPitchStatus} style={{ marginLeft: 'auto' }}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="skipped" /><button type="submit" style={{ ...btn, fontWeight: 400 }}>Skip</button></form>
              </div>
            </div>
          </div>
        </div>
      ))}

      {due.length > 0 && <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '24px 0 8px' }}>Follow up today ({due.length})</h3>}
      {due.map(p => (
        <div key={p.id} style={{ ...card, padding: '8px 12px' }}>
          <strong>{p.company}</strong> &middot; {p.contact_email} &middot; sent {p.sent_at?.slice(0, 10)} &middot; {(p.views || 0) > 0 ? `watched ${p.views} times` : 'not watched yet'}
        </div>
      ))}

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '24px 0 8px' }}>Sent</h3>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <tbody>
          {sent.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid rgba(26,18,5,.12)' }}>
              <td style={{ padding: '6px 4px' }}><a href={`${SITE}/v/${p.slug}`} target="_blank" rel="noreferrer">{p.company}</a></td>
              <td>{p.contact_email}</td>
              <td className="mono" style={{ fontSize: 11 }}>{p.status}</td>
              <td className="mono" style={{ fontSize: 11 }}>{(p.views || 0) > 0 ? `${p.views} views, last ${p.last_viewed_at?.slice(0, 10)}` : 'not watched'}</td>
              <td>
                {p.status !== 'replied' && <form action={setPitchStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="replied" /><button type="submit" style={{ ...btn, padding: '3px 8px', fontSize: 11 }}>They replied</button></form>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
