import { createAdminClient } from '../../../../lib/supabase/admin';
import { rateCompany, addContact, toggleStage, markFollowedUp, deleteContact } from '../../plan-actions';

export const dynamic = 'force-dynamic';

/**
 * TRACK 1 PLAN, referrals first (locked 2026-10-27, Jobs/PLAN_2026-10-27.md). The weekly
 * scoreboard against the plan's targets, tonight's routine, the researched Saudi target
 * companies (each with a live posting as proof they hire) and the people log. Applications are
 * not logged twice: the count comes from job_leads, where the Gulf jobs board already stamps
 * applied_at.
 */
const card = { border: '2px solid var(--ink)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--paper)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '6px 10px', border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const go = { ...btn, background: 'var(--forest)', color: 'var(--paper)' };
const stepNum = { fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brick)', marginRight: 8 };
const input = { fontSize: 13, padding: '6px 8px', border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', minWidth: 0 };
const th = { textAlign: 'left', padding: '6px 8px', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink3)', borderBottom: '2px solid var(--ink)' };
const td = { padding: '8px', borderBottom: '1px solid rgba(26,18,5,0.12)', verticalAlign: 'top', fontSize: 13 };

const STAGES = [['replied', 'Replied'], ['call', 'Call'], ['referral', 'Referral'], ['interview', 'Interview'], ['offer', 'Offer']];
const TIES = ['Alumni (Iqra University)', 'Former colleague', 'Same function', "Brother's network", 'Recruiter', 'Other'];

// Monday to Sunday, the plan's week; Friday is the review day.
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
const hiring = c => (c.url ? 3 : 1);
const score = c => (c.want || 0) + hiring(c) + (c.reach || 0);

export default async function JobPlan() {
  const admin = createAdminClient();
  const [from, to] = weekRange();
  const [{ data: companies }, { data: contacts }, { data: apps }] = await Promise.all([
    admin.from('job_plan_companies').select('*'),
    admin.from('job_plan_contacts').select('*').order('created_at', { ascending: false }),
    admin.from('job_leads').select('id').not('lane', 'in', '(Training,Startups)').gte('applied_at', from).lt('applied_at', to),
  ]);
  const cos = (companies || []).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  const people = contacts || [];
  const inWeek = v => v && v >= from && v < to;
  const count = col => people.filter(p => inWeek(p[col])).length;
  const tiles = [
    ['New people contacted', count('contacted_on'), 15],
    ['Calls held', count('call_on'), 3],
    ['Referrals', count('referral_on'), 2],
    ['Applications', (apps || []).length, 25],
    ['Interviews', count('interview_on'), null],
    ['Offers', count('offer_on'), null],
  ];
  const due = people.filter(p => p.contacted_on && !p.replied_on && !p.followed_up_on && workdaysSince(p.contacted_on) >= 3);
  const perCompany = {};
  for (const p of people) perCompany[p.company] = (perCompany[p.company] || 0) + 1;
  const lastDate = p => [p.offer_on, p.interview_on, p.referral_on, p.call_on, p.replied_on, p.contacted_on].find(Boolean) || '';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', margin: 0 }}>The plan: referrals first</h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Week of {from} &middot; weekdays 7 to 8 pm</span>
        <a href="/admin/jobs" className="mono" style={{ fontSize: 11, color: 'var(--brick)', marginLeft: 'auto' }}>Today&apos;s applications board &rarr;</a>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 16px' }}>
        Locked 2026-10-27. About 40% of referred candidates reach an interview against about 3% of cold applicants (Ashby, 38M applications), so most of the evening goes to people at the companies below and a few well matched applications. Full plan and sources: Jobs/PLAN_2026-10-27.md.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
        {tiles.map(([label, v, target]) => {
          const pct = target ? Math.min(100, Math.round((v / target) * 100)) : v ? 100 : 0;
          return (
            <div key={label} style={{ ...card, marginBottom: 0 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>{v}{target ? <span style={{ fontSize: 14, color: 'var(--ink3)' }}> / {target}</span> : null}</div>
              <div style={{ height: 8, border: '2px solid var(--ink)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--forest)' }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, marginBottom: 6 }}><strong>Tonight</strong></div>
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          <div><span style={stepNum}>1</span>Message 3 new people at the companies below. Ask for a 15 minute chat about their team, not for a job. Add each one in step 4.</div>
          <div><span style={stepNum}>2</span>Follow up once with everyone under &quot;Follow up today&quot;.</div>
          <div><span style={stepNum}>3</span>After a good chat, ask for a referral to one specific posted role, then press Referral on that person.</div>
          <div><span style={stepNum}>4</span>Send 5 well matched applications on the <a href="/admin/jobs">applications board</a>. They count here on their own.</div>
          <div><span style={stepNum}>5</span>Twice a week: 30 minutes of interview practice and the demo walkthrough.</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
          Friday rules: under 1 in 10 replies after 2 weeks, rewrite the message. Calls but no referrals, fix the ask or the proof piece. Referrals but no interviews, fix fit or resume. Interviews but no offers, more practice.
        </div>
      </div>

      {!!due.length && (
        <div style={{ ...card, borderColor: 'var(--brick)' }}>
          <div style={{ fontSize: 15, marginBottom: 6 }}><strong>Follow up today</strong> (3 working days, no reply)</div>
          {due.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
              <strong>{p.name}</strong><span>{p.company}</span>
              {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>profile &#8599;</a>}
              <form action={markFollowedUp}><input type="hidden" name="id" value={p.id} /><button type="submit" style={btn}>Followed up</button></form>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '20px 0 6px' }}>People</h3>
      <form action={addContact} style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, alignItems: 'end' }}>
        <input name="name" placeholder="Name" required style={input} />
        <select name="company" style={input} defaultValue="">
          <option value="" disabled>Company</option>
          {[...cos].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value="Other">Other</option>
        </select>
        <select name="tie" style={input} defaultValue={TIES[0]}>{TIES.map(t => <option key={t}>{t}</option>)}</select>
        <input name="link" type="url" placeholder="LinkedIn profile link" style={input} />
        <button type="submit" style={go}>Add, contacted today</button>
      </form>
      {!people.length ? (
        <p style={{ fontSize: 14, color: 'var(--ink3)' }}>No one yet. Add the first person you message tonight.</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead><tr><th style={th}>Person</th><th style={th}>Company</th><th style={th}>Tie</th><th style={th}>Stages (click to stamp today)</th><th style={th}>Last</th><th style={th}></th></tr></thead>
            <tbody>
              {people.map(p => (
                <tr key={p.id}>
                  <td style={td}><strong>{p.name}</strong>{p.link && <> <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>&#8599;</a></>}</td>
                  <td style={td}>{p.company}</td>
                  <td style={td}>{p.tie}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {STAGES.map(([k, label]) => (
                        <form key={k} action={toggleStage}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="stage" value={k} />
                          <button type="submit" title={p[`${k}_on`] ? `${label} on ${p[`${k}_on`]}, click to clear` : `Mark ${label.toLowerCase()} today`}
                            style={{ ...btn, padding: '3px 8px', fontSize: 11, ...(p[`${k}_on`] ? { background: 'var(--forest)', color: 'var(--paper)' } : {}) }}>{label}</button>
                        </form>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }} className="mono">{lastDate(p)}</td>
                  <td style={td}><form action={deleteContact}><input type="hidden" name="id" value={p.id} /><button type="submit" style={{ ...btn, padding: '3px 8px', fontSize: 11 }}>Remove</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '20px 0 6px' }}>Target companies ({cos.length})</h3>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 8px' }}>
        Each one had a live AI role in Saudi Arabia with no Saudi nationals only rule when researched on 2026-10-27. Set Want (how much you want it) and Reach (how easily you can reach a person there), 1 low to 3 high. Score = Want + Hiring (3 with a live posting) + Reach.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
          <thead><tr><th style={th}>Score</th><th style={th}>Company</th><th style={th}>Open role (proof they hire)</th><th style={th}>Want / Reach</th><th style={th}>People</th></tr></thead>
          <tbody>
            {cos.map(c => (
              <tr key={c.id}>
                <td style={{ ...td, fontFamily: 'var(--font-display)', fontSize: 18 }}>{score(c)}</td>
                <td style={td}><strong>{c.name}</strong><div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{c.segment} &middot; {c.city}</div></td>
                <td style={td}>
                  {c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.role} &#8599;</a> : c.role}
                  <div style={{ fontSize: 12, color: 'var(--ink3)', maxWidth: 480 }}>{c.why}{c.posted && c.posted !== 'unknown' ? ` Posted: ${c.posted}.` : ''}</div>
                </td>
                <td style={td}>
                  <form action={rateCompany} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="hidden" name="id" value={c.id} />
                    <select name="want" defaultValue={c.want ? String(c.want) : ''} style={{ ...input, padding: '3px 4px' }} aria-label="Want">
                      <option value="">W?</option><option value="1">W1</option><option value="2">W2</option><option value="3">W3</option>
                    </select>
                    <select name="reach" defaultValue={c.reach ? String(c.reach) : ''} style={{ ...input, padding: '3px 4px' }} aria-label="Reach">
                      <option value="">R?</option><option value="1">R1</option><option value="2">R2</option><option value="3">R3</option>
                    </select>
                    <button type="submit" style={{ ...btn, padding: '3px 8px', fontSize: 11 }}>Save</button>
                  </form>
                </td>
                <td style={{ ...td, fontFamily: 'var(--font-display)', fontSize: 18 }}>{perCompany[c.name] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
