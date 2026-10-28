import { createAdminClient } from '../../../../lib/supabase/admin';
import { draftReferralMessage } from '../../../../lib/jobs/referralDrafter';
import CopyButton from '../../../components/CopyButton';
import { addContact, toggleStage, markFollowedUp, deleteContact, markRequested, skipSuggestion, markMessaged, redraftMessage, findMorePeople } from '../../plan-actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * TRACK 1 PLAN, referrals first (locked 2026-10-27, Jobs/PLAN_2026-10-27.md).
 * Click and go since 2026-10-28 (Anas: "I should just click and go, everything guided, no
 * thinking"): companies are ranked by fit from the research, the people come from a public
 * search (lib/jobs/peopleFinder.js), and Groq writes every message (lib/jobs/referralDrafter.js).
 * Free LinkedIn caps notes on connection requests, so the flow is: request with no note, then
 * the drafted message once they accept. Applications are counted from job_leads.applied_at.
 */
const card = { border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 12, background: 'var(--paper)', boxShadow: 'var(--shadow)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '6px 11px', border: '1px solid var(--line)', borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const go = { ...btn, background: 'var(--forest)', color: '#FFFEFA', border: 'none' };
const dark = { ...btn, background: 'var(--ink)', color: '#FFFEFA', border: 'none' };
const stepNum = { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: 'var(--brick)', marginRight: 8 };
const input = { fontSize: 13, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', minWidth: 0 };
const th = { textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--grey)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--line)' };
const td = { padding: '8px', borderBottom: '1px solid rgba(26,18,5,0.08)', verticalAlign: 'top', fontSize: 13 };
const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid rgba(26,18,5,0.08)' };

const STAGES = [['replied', 'Replied'], ['call', 'Call'], ['referral', 'Referral'], ['interview', 'Interview'], ['offer', 'Offer']];
const TIES = ['Alumni (Iqra University)', 'Former colleague', 'Same function', "Brother's network", 'Recruiter', 'Other'];
const FIT_LABEL = { 3: ['strong fit', 'var(--forest)'], 2: ['good fit', 'var(--amber)'], 1: ['stretch', 'var(--grey)'] };
const REQUESTS_PER_NIGHT = 5;   // about 3 a night should accept and get the message, the plan's 15 a week

function weekRange() {
  const d = new Date();
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
// Working days follow the Saudi week (Sunday to Thursday), so Friday and Saturday are skipped.
function workdaysSince(day) {
  const d = new Date(`${day}T12:00:00Z`); const now = new Date(); let n = 0;
  while (true) { d.setUTCDate(d.getUTCDate() + 1); if (d > now) break; if (d.getUTCDay() !== 5 && d.getUTCDay() !== 6) n++; }
  return n;
}

function Fit({ fit }) {
  const [label, color] = FIT_LABEL[fit] || ['unrated', 'var(--grey)'];
  return <span className="mono" style={{ fontSize: 11, color, border: `1px solid ${color}`, borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap' }}>{label}</span>;
}

export default async function JobPlan() {
  const admin = createAdminClient();
  const [from, to] = weekRange();
  const [{ data: companies }, { data: contacts }, { data: apps }, { data: sugg }] = await Promise.all([
    admin.from('job_plan_companies').select('*'),
    admin.from('job_plan_contacts').select('*').order('created_at', { ascending: false }),
    admin.from('job_leads').select('id').not('lane', 'in', '(Training,Startups)').gte('applied_at', from).lt('applied_at', to),
    admin.from('job_plan_suggestions').select('*').in('status', ['new', 'requested']).order('created_at'),
  ]);
  const cos = (companies || []).sort((a, b) => (b.fit || 0) - (a.fit || 0) || a.name.localeCompare(b.name));
  const fitOf = Object.fromEntries(cos.map(c => [c.id, c.fit || 0]));
  const coById = Object.fromEntries(cos.map(c => [c.id, c]));
  const suggestions = sugg || [];
  // Tonight's requests: best fit companies first, at most one person per company, so a night
  // reaches five companies instead of five people at one.
  const seen = new Set();
  const toRequest = suggestions.filter(s => s.status === 'new')
    .sort((a, b) => (fitOf[b.company_id] || 0) - (fitOf[a.company_id] || 0))
    .filter(s => (seen.has(s.company_id) ? false : seen.add(s.company_id)))
    .slice(0, REQUESTS_PER_NIGHT);
  const toMessage = suggestions.filter(s => s.status === 'requested');

  // Write any missing messages now, so every one is ready to copy (a few per page load keeps it fast).
  for (const s of toMessage.filter(x => !x.message).slice(0, 4)) {
    try {
      const c = coById[s.company_id] || {};
      s.message = await draftReferralMessage({ name: s.name, title: s.title, company: s.company, role: c.role, why: c.why });
      await admin.from('job_plan_suggestions').update({ message: s.message }).eq('id', s.id);
    } catch { /* shows a Write message button instead */ }
  }

  const people = contacts || [];
  const inWeek = v => v && v >= from && v < to;
  const count = col => people.filter(p => inWeek(p[col])).length;
  const tiles = [
    ['People messaged', count('contacted_on'), 15],
    ['Calls held', count('call_on'), 3],
    ['Referrals', count('referral_on'), 2],
    ['Applications', (apps || []).length, 25],
    ['Interviews', count('interview_on'), null],
    ['Offers', count('offer_on'), null],
  ];
  const due = people.filter(p => p.contacted_on && !p.replied_on && !p.followed_up_on && workdaysSince(p.contacted_on) >= 3);
  const found = {};
  for (const s of suggestions) found[s.company_id] = (found[s.company_id] || 0) + 1;
  const lastDate = p => [p.offer_on, p.interview_on, p.referral_on, p.call_on, p.replied_on, p.contacted_on].find(Boolean) || '';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>Tonight, <span className="em">click by click</span></h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--grey)' }}>// week of {from} · weekdays 7 to 8 pm</span>
        <a href="/admin/jobs" className="mono" style={{ fontSize: 11, color: 'var(--brick)', marginLeft: 'auto' }}>applications board &rarr;</a>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 16px' }}>
        No research on your side. The companies are ranked by fit, the people are found for you, and every message is already written. Do the steps in order and press the button after each one.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {tiles.map(([label, v, target]) => {
          const pct = target ? Math.min(100, Math.round((v / target) * 100)) : v ? 100 : 0;
          return (
            <div key={label} style={{ ...card, marginBottom: 0 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--grey)' }}>{label.toLowerCase()}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28 }}>{v}{target ? <span style={{ fontSize: 14, color: 'var(--ink3)' }}> / {target}</span> : null}</div>
              <div style={{ height: 6, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--forest)' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ fontSize: 15 }}><span style={stepNum}>1</span><strong>Message the people who accepted</strong> ({toMessage.length})</div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', margin: '4px 0 2px' }}>Open the profile. If the request was accepted, copy the message, paste it in LinkedIn messages, send, then press Messaged. If not accepted yet, leave it here for tomorrow.</div>
        {!toMessage.length && <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 0' }}>Nobody is waiting yet. Start with step 2; accepted requests show up here.</div>}
        {toMessage.map(s => (
          <div key={s.id} style={{ ...row, alignItems: 'flex-start', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <strong>{s.name}</strong><span style={{ fontSize: 13, color: 'var(--ink3)' }}>{s.title}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--grey)' }}>requested {s.requested_on}</span>
            </div>
            {s.message
              ? <div style={{ fontSize: 14, background: 'var(--paper2)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5, maxWidth: 680 }}>{s.message}</div>
              : <div style={{ fontSize: 13, color: 'var(--brick)' }}>The message could not be written just now.</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <a href={s.url} target="_blank" rel="noreferrer" style={dark}>Open profile &#8599;</a>
              {s.message && <CopyButton text={s.message} label="Copy message" />}
              <form action={markMessaged}><input type="hidden" name="id" value={s.id} /><button type="submit" style={go}>Messaged</button></form>
              <form action={redraftMessage}><input type="hidden" name="id" value={s.id} /><button type="submit" style={btn}>{s.message ? 'Write it again' : 'Write message'}</button></form>
              <form action={skipSuggestion}><input type="hidden" name="id" value={s.id} /><button type="submit" style={btn}>Skip</button></form>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 15 }}><span style={stepNum}>2</span><strong>Send {toRequest.length} connection requests</strong></div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', margin: '4px 0 2px' }}>Open the profile, press Connect, choose &quot;Send without a note&quot; (free LinkedIn only allows a few notes a month), then press Request sent. The message is written for you once they accept.</div>
        {!toRequest.length && <div style={{ fontSize: 13, color: 'var(--ink3)', padding: '8px 0' }}>No new people left. Press &quot;Find more people&quot; on any company below.</div>}
        {toRequest.map(s => (
          <div key={s.id} style={row}>
            <Fit fit={fitOf[s.company_id]} />
            <strong>{s.name}</strong>
            <span style={{ fontSize: 13, color: 'var(--ink3)', flex: '1 1 260px' }}>{s.title}</span>
            <a href={s.url} target="_blank" rel="noreferrer" style={dark}>Open profile &#8599;</a>
            <form action={markRequested}><input type="hidden" name="id" value={s.id} /><button type="submit" style={go}>Request sent</button></form>
            <form action={skipSuggestion}><input type="hidden" name="id" value={s.id} /><button type="submit" style={btn}>Skip</button></form>
          </div>
        ))}
      </div>

      {!!due.length && (
        <div style={card}>
          <div style={{ fontSize: 15 }}><span style={stepNum}>3</span><strong>Follow up</strong> (messaged 3 working days ago, no reply)</div>
          {due.map(p => (
            <div key={p.id} style={row}>
              <strong>{p.name}</strong><span style={{ fontSize: 13 }}>{p.company}</span>
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={dark}>Open profile &#8599;</a>}
              <CopyButton text={`Hi ${String(p.name).split(' ')[0]}, just bringing this back up in case it got buried. A quick 15 minute chat about your team would help me a lot, whenever suits you.`} label="Copy follow up" />
              <form action={markFollowedUp}><input type="hidden" name="id" value={p.id} /><button type="submit" style={go}>Followed up</button></form>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 15 }}><span style={stepNum}>{due.length ? 4 : 3}</span><strong>Send 5 applications</strong> on the <a href="/admin/jobs">applications board</a>. Every application there is already written for you; they count here on their own.</div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, margin: '24px 0 6px' }}>People you messaged</h3>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 8px' }}>When someone replies, agrees to a call or refers you, press that stage. The weekly numbers above update from here.</p>
      {!people.length ? (
        <p style={{ fontSize: 14, color: 'var(--ink3)' }}>Nobody yet. They appear here when you press Messaged.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead><tr><th style={th}>person</th><th style={th}>company</th><th style={th}>stages (click to stamp today)</th><th style={th}>last</th><th style={th}></th></tr></thead>
            <tbody>
              {people.map(p => (
                <tr key={p.id}>
                  <td style={td}><strong>{p.name}</strong>{p.link && <> <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>&#8599;</a></>}<div style={{ fontSize: 12, color: 'var(--ink3)' }}>{p.tie}</div></td>
                  <td style={td}>{p.company}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {STAGES.map(([k, label]) => (
                        <form key={k} action={toggleStage}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="stage" value={k} />
                          <button type="submit" title={p[`${k}_on`] ? `${label} on ${p[`${k}_on`]}, click to clear` : `Mark ${label.toLowerCase()} today`}
                            style={{ ...btn, padding: '3px 9px', fontSize: 11, ...(p[`${k}_on`] ? { background: 'var(--forest)', color: '#FFFEFA', border: 'none' } : {}) }}>{label}</button>
                        </form>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }} className="mono">{lastDate(p)}</td>
                  <td style={td}><form action={deleteContact}><input type="hidden" name="id" value={p.id} /><button type="submit" style={{ ...btn, padding: '3px 9px', fontSize: 11 }}>Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details style={{ margin: '4px 0 16px' }}>
        <summary className="mono" style={{ fontSize: 12, color: 'var(--grey)', cursor: 'pointer' }}>// someone you already know? add them by hand</summary>
        <form action={addContact} style={{ ...card, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, alignItems: 'end' }}>
          <input name="name" placeholder="Name" required style={input} />
          <select name="company" style={input} defaultValue="">
            <option value="" disabled>Company</option>
            {[...cos].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="Other">Other</option>
          </select>
          <select name="tie" style={input} defaultValue={TIES[0]}>{TIES.map(t => <option key={t}>{t}</option>)}</select>
          <input name="link" type="url" placeholder="LinkedIn profile link" style={input} />
          <button type="submit" style={go}>Add, messaged today</button>
        </form>
      </details>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, margin: '24px 0 6px' }}>Target companies ({cos.length})</h3>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 8px' }}>
        Ranked for you from the 2026-10-27 research. Each one had a live AI role in Saudi Arabia with no Saudi nationals only rule. Strong fit means a hands on role at your level with no Arabic required.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
          <thead><tr><th style={th}>fit</th><th style={th}>company</th><th style={th}>open role (proof they hire)</th><th style={th}>people found</th></tr></thead>
          <tbody>
            {cos.map(c => (
              <tr key={c.id}>
                <td style={td}><Fit fit={c.fit} /></td>
                <td style={td}><strong>{c.name}</strong><div className="mono" style={{ fontSize: 11, color: 'var(--grey)' }}>{c.segment} · {c.city}</div></td>
                <td style={td}>
                  {c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.role} &#8599;</a> : c.role}
                  <div style={{ fontSize: 12, color: 'var(--ink3)', maxWidth: 480 }}>{c.fit_note ? `${c.fit_note}. ` : ''}{c.why}</div>
                </td>
                <td style={td}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18 }}>{found[c.id] || 0}</div>
                  <form action={findMorePeople}><input type="hidden" name="id" value={c.id} /><button type="submit" style={{ ...btn, padding: '3px 9px', fontSize: 11, whiteSpace: 'nowrap' }}>Find more people</button></form>
                  {/* The free search behind the button gets blocked after a burst, so a ready LinkedIn search is always one click away. */}
                  <a href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${c.name.replace(/\(.*?\)/g, '').trim()} AI engineer Saudi`)}`} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--grey)', display: 'block', marginTop: 4 }}>search linkedin &#8599;</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
