import { createAdminClient } from '../../../lib/supabase/admin';
import { STARTUP_DAILY_GOAL } from '../../../lib/jobs/targets';
import CopyButton from '../../components/CopyButton';
import { markApplied, setStatus, sendEmailNow, findContact, saveContactEmail, draftJob, prepareMoreAction, findEmailsBatchAction, refreshJobs, addStartupRole } from '../jobs-actions';

/**
 * THE STARTUP ROLES BOARD (2026-10-11). Same idea as the Jobs board (TodayBoard.js): every
 * startup role on one screen, not one card at a time, because Anas said the one-at-a-time
 * queue hid what he needs to judge a role at a glance: the posting, its details, the founders,
 * their LinkedIn, the email and a one click send. Each card is one real open role applied for
 * by emailing the founder with the tailored resume attached.
 */
const card = { border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--paper)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '7px 12px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const go = { ...btn, background: 'var(--forest)', color: 'var(--paper)', boxShadow: 'var(--shadow)' };
const dark = { ...btn, background: 'var(--ink)', color: 'var(--paper)' };
const small = { fontSize: 11, fontWeight: 600, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const label = { fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', minWidth: 74, display: 'inline-block' };
const input = { fontSize: 13, padding: '8px 10px' };

const ageDays = j => (j.posted_at ? (Date.now() - new Date(j.posted_at).getTime()) / 86400000 : null);
const fitLine = j => (j.notes || '').split('\n').map(l => l.replace(/^\[[^\]]*\]\s*/, '')).find(l => /^(Fit|Stretch|Mismatch):/.test(l)) || '';
const SOURCE = { yc_startup: 'YC', hn_startup: 'Hacker News', manual_startup: 'Added by you' };
const role = j => (j.title || '').replace(/^.*? — hiring /, '');

/** Other founders the fetcher wrote into notes: "Name (https://www.linkedin.com/in/x), ...". */
function otherFounders(notes) {
  const line = (notes || '').split('\n').find(l => l.startsWith('Other founders'));
  if (!line) return [];
  return [...line.matchAll(/([A-Z][^,(:]+?)\s*\((https:\/\/www\.linkedin\.com\/in\/[^)\s]+)\)/g)].map(m => ({ name: m[1].trim(), url: m[2] }));
}
/** Alternate addresses written into notes by any source ("Other emails ...", "Other addresses ..."). */
function otherEmails(notes, primary) {
  const lines = (notes || '').split('\n').filter(l => /^Other (emails|addresses)/.test(l));
  const all = lines.flatMap(l => l.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []);
  return [...new Set(all.map(e => e.toLowerCase()))].filter(e => e !== (primary || '').toLowerCase());
}
/** The short facts line and the full requirement, split out of the stored description. */
function roleDetails(j) {
  const d = j.description || '';
  const facts = (d.split(/\n\n/)[0] || '').replace(/^Open role[^:]*:\s*/, '').replace(/\s*NOT on his resume, never claim these:[^.]*\./, '').replace(/Of those, Anas genuinely has:/, 'You have:')
    .replace(/\s*Pick the ONE[^.]*\./, '').replace(/^/, j.source === 'hn_startup' ? 'Roles in your lane: ' : '').slice(0, 420);
  const full = (d.split(/FULL (?:ROLE REQUIREMENT|POST)[^\n]*\n/)[1] || '').split('\n\n(Background only')[0].trim();
  const about = (d.split('About the company: ')[1] || '').trim();
  return { facts, full, about };
}
function peopleSearch(company) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company || ''} founder`)}`;
}

export default async function StartupBoard() {
  const admin = createAdminClient();
  const { data } = await admin.from('job_leads').select('*').eq('lane', 'Startups').order('score', { ascending: false }).limit(400);
  const all = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const sentToday = all.filter(j => j.applied_at && j.applied_at.slice(0, 10) === today).length;
  const open = all.filter(j => j.status === 'new' || j.status === 'shortlisted');
  // Ready with an email first (one click each), then ready without, then not yet written.
  const order = j => (j.cover_note ? 0 : 2) + (j.contact_email ? 0 : 1);
  const rows = [...open].sort((a, b) => order(a) - order(b) || b.score - a.score);
  const ready = open.filter(j => j.cover_note).length;
  const withEmail = open.filter(j => j.contact_email).length;
  const goal = STARTUP_DAILY_GOAL;
  const pct = Math.min(100, Math.round((sentToday / goal) * 100));
  const laneField = <input type="hidden" name="lane" value="Startups" />;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', margin: 0 }}>Founder applications today: {sentToday} of {goal}</h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {open.length} open roles &middot; {ready} written &middot; {withEmail} with a founder email
        </span>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <a href="/admin/jobs" className="mono" style={{ fontSize: 11, color: 'var(--brick)' }}>Gulf job applications &rarr;</a>
          <a href="/admin/jobs/all" className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>All jobs and settings &rarr;</a>
        </div>
      </div>
      <div style={{ height: 10, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--forest)' }} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 12px' }}>
        Real open roles at startups (YC, Hacker News, and the ones you add). Green send button = the email goes to the founder now with your tailored resume attached, and the role is marked applied. Then send the connection note on LinkedIn.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <form action={prepareMoreAction}>{laneField}<button type="submit" style={dark}>Write the next 10</button></form>
        <form action={findEmailsBatchAction}>{laneField}<button type="submit" style={btn}>Find founder emails for the next 10</button></form>
        <form action={refreshJobs}>{laneField}<button type="submit" style={btn}>Fetch new startup roles</button></form>
      </div>

      <details style={{ ...card, padding: '10px 14px' }}>
        <summary style={{ cursor: 'pointer', fontSize: 14 }}><strong>Found a startup role yourself?</strong> Paste it here (Wellfound, LinkedIn, X, a VC job board, a founder&apos;s post). It gets a tailored resume, cover letter and founder email right away.</summary>
        <form action={addStartupRole} style={{ display: 'grid', gap: 8, marginTop: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <input name="url" type="url" required placeholder="Link to the posting (required)" style={input} />
          <input name="company" placeholder="Company" style={input} />
          <input name="role" placeholder="Role, as they wrote it" style={input} />
          <input name="location" placeholder="Location (Remote, Dubai, SF onsite)" style={input} />
          <input name="founder" placeholder="Founder's name (if known)" style={input} />
          <input name="email" type="email" placeholder="Founder's email (if known)" style={input} />
          <input name="linkedin" type="url" placeholder="Founder's LinkedIn (if known)" style={input} />
          <textarea name="text" rows={4} placeholder="Paste the posting text too if the page needs a login (LinkedIn, Wellfound often do)" style={{ ...input, gridColumn: '1 / -1' }} />
          <button className="btn" type="submit" style={{ justifySelf: 'start' }}>Add and write it (about 15 seconds)</button>
        </form>
      </details>

      {!rows.length && (
        <div style={{ ...card, textAlign: 'center', padding: '26px 16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 6 }}>No open startup roles.</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)' }}>Press &quot;Fetch new startup roles&quot;, or paste one you found above.</div>
        </div>
      )}

      {rows.slice(0, 120).map(j => {
        const fit = fitLine(j);
        const age = ageDays(j);
        const { facts, full, about } = roleDetails(j);
        const founders = otherFounders(j.notes);
        const altEmails = otherEmails(j.notes, j.contact_email);
        const sourceLine = (j.notes || '').split('\n').find(l => l.startsWith('Source:') || l.startsWith('Company site:'));
        return (
          <div key={j.id} style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>{role(j)}</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{j.company}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                {j.location || 'location not stated'}{j.salary_label && j.salary_label !== 'unknown' ? ` · ${j.salary_label}` : ''} &middot; {SOURCE[j.source] || j.source}{age !== null ? ` · ${Math.round(age)}d old` : ''}
              </span>
            </div>
            {facts && <div style={{ fontSize: 12.5, color: 'var(--ink2, var(--ink))', margin: '6px 0 2px', lineHeight: 1.45 }}>{facts}</div>}
            {fit && <div style={{ fontSize: 12, color: /^Fit:/.test(fit) ? 'var(--forest)' : 'var(--brick)', margin: '4px 0' }}>{fit}</div>}

            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="mono" style={label}>Founder</span>
                {j.contact_url
                  ? <a href={j.contact_url} target="_blank" rel="noreferrer" style={small}>{j.contact_name || 'LinkedIn profile'} on LinkedIn &#8599;</a>
                  : <span style={{ fontSize: 13 }}>{j.contact_name || 'name not found'}</span>}
                {founders.map(f => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" style={small}>{f.name} &#8599;</a>)}
                {!j.contact_url && !founders.length && <a href={peopleSearch(j.company)} target="_blank" rel="noreferrer" style={small}>Search founders on LinkedIn &#8599;</a>}
                {j.dm_text && <CopyButton text={j.dm_text} label="Copy connection note" />}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="mono" style={label}>Email</span>
                {j.contact_email ? <span style={{ fontSize: 13 }}>{j.contact_email}</span> : <span style={{ fontSize: 13, color: 'var(--ink3)' }}>none found yet</span>}
                {altEmails.map(e => (
                  <form key={e} action={saveContactEmail} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={j.id} />
                    <input type="hidden" name="contact_email" value={e} />
                    <button type="submit" style={small} title="Make this the address the send button uses">Use {e}</button>
                  </form>
                ))}
                {!j.contact_email && (
                  <>
                    <form action={findContact} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={j.id} />
                      <button type="submit" style={small}>Find email</button>
                    </form>
                    <form action={saveContactEmail} style={{ display: 'inline-flex', gap: 4 }}>
                      <input type="hidden" name="id" value={j.id} />
                      <input name="contact_email" type="email" placeholder="or paste one" style={{ fontSize: 12, padding: '4px 8px', width: 190 }} />
                      <button type="submit" style={small}>Save</button>
                    </form>
                  </>
                )}
              </div>
              {sourceLine && <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{sourceLine}</div>}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
              {j.cover_note ? (
                <>
                  {j.contact_email && (
                    <form action={sendEmailNow}>
                      <input type="hidden" name="id" value={j.id} />
                      <button type="submit" style={go}>Send to {j.contact_email} with resume &rarr;</button>
                    </form>
                  )}
                  <a href={`/api/jobs/resume?id=${j.id}`} style={btn}>Resume PDF</a>
                  <a href={`/admin/jobs/${j.id}/resume`} target="_blank" rel="noreferrer" style={btn}>Read resume</a>
                  <CopyButton text={j.cover_note} label="Copy cover letter" />
                </>
              ) : (
                <form action={draftJob}>
                  <input type="hidden" name="id" value={j.id} />
                  <button type="submit" style={dark}>Write resume, cover letter and email (10 s)</button>
                </form>
              )}
              <a href={j.url} target="_blank" rel="noreferrer" style={btn}>Open the role &#8599;</a>
              <form action={markApplied}>
                <input type="hidden" name="id" value={j.id} />
                <button type="submit" style={btn}>Applied another way &#10003;</button>
              </form>
              <form action={setStatus} style={{ marginLeft: 'auto' }}>
                <input type="hidden" name="id" value={j.id} />
                <input type="hidden" name="status" value="skipped" />
                <button type="submit" style={{ ...btn, fontWeight: 400 }}>Skip</button>
              </form>
            </div>

            <details style={{ marginTop: 8 }}>
              <summary className="mono" style={{ fontSize: 10, cursor: 'pointer', color: 'var(--ink3)', textTransform: 'uppercase' }}>Full role details{j.cover_note ? ', cover letter, email and connection note' : ''}</summary>
              {full && <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45, marginTop: 6, padding: '8px 10px', background: 'rgba(26,18,5,0.03)', borderRadius: 6 }}>{full}</div>}
              {about && <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6 }}><strong>About the company:</strong> {about}</div>}
              {j.cover_note && <div style={{ marginTop: 10 }}><span className="mono" style={label}>Cover letter</span><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45 }}>{j.cover_note}</div></div>}
              {j.email_body && <div style={{ marginTop: 10 }}><span className="mono" style={label}>Email</span><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45, padding: '8px 10px', background: 'rgba(26,18,5,0.03)', borderRadius: 6 }}><strong>{j.email_subject}</strong>{'\n\n'}{j.email_body}</div></div>}
              {j.dm_text && <div style={{ marginTop: 10 }}><span className="mono" style={label}>Connection note</span><div style={{ fontSize: 13 }}>{j.dm_text}</div></div>}
              {j.answers && j.answers.split('\n\n').map((block, i) => {
                const [q, ...rest] = block.split('\n');
                return (
                  <div key={i} style={{ marginTop: 8 }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginRight: 6 }}>{q}</span>
                    <CopyButton text={rest.join('\n')} label="Copy" />
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{rest.join('\n')}</div>
                  </div>
                );
              })}
            </details>
          </div>
        );
      })}
    </>
  );
}
