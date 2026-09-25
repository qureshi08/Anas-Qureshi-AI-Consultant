import { createAdminClient } from '../../../lib/supabase/admin';
import { getSettings } from '../../../lib/jobs/settings';
import { DAILY_GOAL_MIN } from '../../../lib/jobs/targets';
import CopyButton from '../../components/CopyButton';
import { markApplied, setStatus, sendEmailNow, findContact, prepareMoreAction, findEmailsBatchAction, refreshJobs } from '../jobs-actions';

/**
 * THE 50 A DAY BOARD (2026-09-25). Anas's target is at least 50 applications a day in one hour,
 * so this page is a list, not one card at a time: every ready application on one screen, each
 * with its whole kit. Email applications go out with one click (tailored resume attached);
 * portal applications are open, upload, paste, press Applied.
 * The one-at-a-time flow still runs the Training and Startups lanes (JobsQueue.js).
 */
const card = { border: '2px solid var(--ink)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, background: 'var(--paper)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '7px 12px', border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' };
const go = { ...btn, background: 'var(--forest)', color: 'var(--paper)', boxShadow: '2px 2px 0 var(--ink)' };
const dark = { ...btn, background: 'var(--ink)', color: 'var(--paper)' };

const ageDays = j => (j.posted_at ? (Date.now() - new Date(j.posted_at).getTime()) / 86400000 : 7);
const fitLine = j => (j.notes || '').split('\n').map(l => l.replace(/^\[[^\]]*\]\s*/, '')).find(l => /^(Fit|Stretch|Mismatch):/.test(l)) || '';

export default async function TodayBoard() {
  const admin = createAdminClient();
  const [{ data }, settings] = await Promise.all([
    admin.from('job_leads').select('*').not('lane', 'in', '(Training,Startups)').order('score', { ascending: false }).limit(600),
    getSettings(),
  ]);
  const all = data || [];
  const goal = Math.max(DAILY_GOAL_MIN, Number(settings.daily_goal) || 0);
  const today = new Date().toISOString().slice(0, 10);
  const appliedToday = all.filter(j => j.applied_at && j.applied_at.slice(0, 10) === today).length;
  const rank = (a, b) => (b.score - ageDays(b) / 3) - (a.score - ageDays(a) / 3);
  const open = all.filter(j => j.status === 'new' || j.status === 'shortlisted');
  // Email ready first: they are one click each, the fastest way through the 50.
  const ready = open.filter(j => j.cover_note).sort((a, b) => (b.contact_email ? 1 : 0) - (a.contact_email ? 1 : 0) || rank(a, b));
  const waiting = open.filter(j => !j.cover_note).length;
  const withEmail = ready.filter(j => j.contact_email).length;
  const pct = Math.min(100, Math.round((appliedToday / goal) * 100));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', margin: 0 }}>Applied today: {appliedToday} of {goal}</h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {ready.length} ready &middot; {withEmail} by email &middot; {waiting} still to write
        </span>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <a href="/admin/jobs/startups" className="mono" style={{ fontSize: 11, color: 'var(--brick)' }}>Founder pitches &rarr;</a>
          <a href="/admin/jobs/all" className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>All jobs and settings &rarr;</a>
        </div>
      </div>
      <div style={{ height: 10, border: '2px solid var(--ink)', borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--forest)' }} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 12px' }}>
        AI / Solutions Engineer roles only. Green button = the email goes out now with your tailored resume attached. No email? Open the job, upload the resume, paste the cover note, then press Applied.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <form action={prepareMoreAction}><button type="submit" style={dark}>Write the next 10 applications</button></form>
        <form action={findEmailsBatchAction}><button type="submit" style={btn}>Find emails for the next 10</button></form>
        <form action={refreshJobs}><input type="hidden" name="lane" value="" /><button type="submit" style={btn}>Fetch new jobs now</button></form>
      </div>

      {!ready.length && (
        <div style={{ ...card, textAlign: 'center', padding: '26px 16px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 6 }}>Nothing written yet.</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)' }}>
            {waiting ? `${waiting} jobs are waiting. Press "Write the next 10", about 30 seconds each press.` : 'No jobs in the queue. Press "Fetch new jobs now".'}
          </div>
        </div>
      )}

      {ready.slice(0, 80).map(j => {
        const fit = fitLine(j);
        return (
          <div key={j.id} style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <a href={`/admin/jobs/${j.id}`} style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', textDecoration: 'none' }}>{j.title}</a>
              <span style={{ fontSize: 14 }}>{j.company}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                {j.location || 'location not stated'} &middot; {j.lane}{Number.isFinite(j.applicants) ? ` · ${j.applicants} applicants` : ''} &middot; {Math.round(ageDays(j))}d old
              </span>
            </div>
            {fit && <div style={{ fontSize: 12, color: /^Fit:/.test(fit) ? 'var(--forest)' : 'var(--brick)', margin: '4px 0' }}>{fit}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
              {j.contact_email ? (
                <form action={sendEmailNow}>
                  <input type="hidden" name="id" value={j.id} />
                  <button type="submit" style={go}>Send to {j.contact_email} &rarr;</button>
                </form>
              ) : (
                <form action={findContact}>
                  <input type="hidden" name="id" value={j.id} />
                  <button type="submit" style={btn}>Find email</button>
                </form>
              )}
              <a href={j.url} target="_blank" rel="noreferrer" style={dark}>Open job &#8599;</a>
              <a href={`/api/jobs/resume?id=${j.id}`} style={btn}>Resume PDF</a>
              <CopyButton text={j.cover_note} label="Copy cover note" />
              <form action={markApplied}>
                <input type="hidden" name="id" value={j.id} />
                <button type="submit" style={go}>Applied &#10003;</button>
              </form>
              <form action={setStatus} style={{ marginLeft: 'auto' }}>
                <input type="hidden" name="id" value={j.id} />
                <input type="hidden" name="status" value="skipped" />
                <button type="submit" style={{ ...btn, fontWeight: 400 }}>Skip</button>
              </form>
            </div>
            <details style={{ marginTop: 6 }}>
              <summary className="mono" style={{ fontSize: 10, cursor: 'pointer', color: 'var(--ink3)', textTransform: 'uppercase' }}>Cover note, email and form answers</summary>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45, marginTop: 6 }}>{j.cover_note}</div>
              {j.email_body && <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45, marginTop: 8, padding: '8px 10px', background: 'rgba(26,18,5,0.03)', borderRadius: 6 }}><strong>{j.email_subject}</strong>{'\n\n'}{j.email_body}</div>}
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
