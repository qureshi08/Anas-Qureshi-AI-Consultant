import { createAdminClient } from '../../../lib/supabase/admin';
import CopyButton from '../../components/CopyButton';
import { advanceJob, prepareCurrentAction, refreshJobs } from '../jobs-actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * ONE JOB AT A TIME. This page shows the next job to apply to and nothing else: four steps,
 * two buttons. The full table, settings and filters live at /admin/jobs/all.
 * Rebuilt 2026-09-03 after Anas said the control panel version was confusing.
 */
const step = { border: '2px solid var(--ink)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, background: 'var(--paper)' };
const stepNum = { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--brick)', marginRight: 8 };
const bigLink = { display: 'inline-block', fontSize: 14, fontWeight: 700, padding: '10px 18px', border: '2px solid var(--ink)', borderRadius: 8, background: 'var(--ink)', color: 'var(--paper)', textDecoration: 'none', boxShadow: '3px 3px 0 var(--brick)' };
const plainLink = { display: 'inline-block', fontSize: 13, padding: '8px 14px', border: '2px solid var(--ink)', borderRadius: 8, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none' };

function peopleSearch(company, role) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${company || ''} ${role || ''}`.trim())}`;
}

export default async function JobsToday() {
  const admin = createAdminClient();
  const { data } = await admin.from('job_leads').select('*').order('score', { ascending: false }).order('posted_at', { ascending: false }).limit(400);
  const all = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const appliedToday = all.filter(j => j.applied_at && j.applied_at.slice(0, 10) === today).length;
  const queue = all.filter(j => j.status === 'new' || j.status === 'shortlisted');
  const job = queue[0];
  const goal = 10;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--ink)', margin: 0 }}>
          Applied today: {appliedToday} of {goal}
        </h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {queue.length} jobs waiting
        </span>
        <a href="/admin/jobs/all" className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto' }}>See all jobs and settings &rarr;</a>
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 18 }}>
        One job at a time. Do the four steps, press the green button, the next job appears.
      </p>

      {!job && (
        <div style={{ ...step, textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 10 }}>Nothing in the queue.</div>
          <form action={refreshJobs}><button className="btn" type="submit">Get new jobs</button></form>
        </div>
      )}

      {job && !job.cover_note && (
        <div style={{ ...step, textAlign: 'center', padding: '26px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 4 }}>{job.title}</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 14 }}>{job.company} &middot; {job.location}</div>
          <form action={prepareCurrentAction}>
            <button className="btn" type="submit" style={{ fontSize: 15, padding: '12px 22px' }}>Write my application for this job</button>
          </form>
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 10 }}>Takes about 10 seconds. Then the steps appear.</p>
        </div>
      )}

      {job && job.cover_note && (
        <>
          <div style={{ border: '2px solid var(--ink)', borderRadius: 10, padding: '14px 16px', marginBottom: 12, background: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink)', lineHeight: 1.15 }}>{job.title}</div>
            <div style={{ fontSize: 15, marginTop: 2 }}>{job.company}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>{job.location || 'location not stated'}</div>
            {job.notes && <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{job.notes.split('\n')[0]}</div>}
          </div>

          <div style={step}>
            <div style={{ fontSize: 15, marginBottom: 10 }}><span style={stepNum}>1</span><strong>Open the job and start the application.</strong></div>
            <a href={job.url} target="_blank" rel="noreferrer" style={bigLink}>Open the job page &#8599;</a>
          </div>

          <div style={step}>
            <div style={{ fontSize: 15, marginBottom: 6 }}><span style={stepNum}>2</span><strong>Get your resume for this job.</strong> It opens, you press Print, choose Save as PDF, then upload that file.</div>
            <a href={`/admin/jobs/${job.id}/resume`} target="_blank" rel="noreferrer" style={bigLink}>Open my resume for this job &#8599;</a>
          </div>

          <div style={step}>
            <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>3</span><strong>Paste this where the form asks why you are applying.</strong></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <CopyButton text={job.cover_note} label="Copy this text" />
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>cover letter</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14, background: 'rgba(26,18,5,0.03)', padding: '10px 12px', borderRadius: 8 }}>{job.cover_note}</div>
            {job.answers && (
              <details style={{ marginTop: 10 }}>
                <summary className="mono" style={{ fontSize: 11, cursor: 'pointer', color: 'var(--ink3)' }}>If the form asks more questions (salary, notice period, why us), open this</summary>
                {job.answers.split('\n\n').map((block, i) => {
                  const [q, ...rest] = block.split('\n');
                  const a = rest.join('\n');
                  return (
                    <div key={i} style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{q}</span>
                        <CopyButton text={a} label="Copy" />
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45 }}>{a}</div>
                    </div>
                  );
                })}
              </details>
            )}
          </div>

          <div style={step}>
            <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>4</span><strong>Message one person there.</strong> This doubles your chances, do not skip it.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {job.contact_url
                ? <a href={job.contact_url} target="_blank" rel="noreferrer" style={bigLink}>Open {job.contact_name || 'the contact'} &#8599;</a>
                : <a href={peopleSearch(job.company, job.contact_role || 'hiring manager')} target="_blank" rel="noreferrer" style={bigLink}>Find someone at {job.company} &#8599;</a>}
              <CopyButton text={job.dm_text || ''} label="Copy the message" />
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14, background: 'rgba(26,18,5,0.03)', padding: '10px 12px', borderRadius: 8 }}>{job.dm_text}</div>
            {job.email_body && (
              <details style={{ marginTop: 10 }}>
                <summary className="mono" style={{ fontSize: 11, cursor: 'pointer', color: 'var(--ink3)' }}>If you have their email instead, open this</summary>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 4px' }}>
                  <CopyButton text={job.email_subject || ''} label="Copy subject" />
                  <CopyButton text={job.email_body} label="Copy email" />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>Subject: {job.email_subject}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45 }}>{job.email_body}</div>
              </details>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 16 }}>
            <form action={advanceJob}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="action" value="applied" />
              <button type="submit" style={{ fontSize: 16, fontWeight: 700, padding: '14px 26px', border: '2px solid var(--ink)', borderRadius: 10, background: 'var(--forest)', color: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)', cursor: 'pointer' }}>
                Done, next job &rarr;
              </button>
            </form>
            <form action={advanceJob}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="action" value="skip" />
              <button type="submit" style={{ ...plainLink, cursor: 'pointer' }}>Not for me, skip it</button>
            </form>
            <a href={`/admin/jobs/${job.id}`} className="mono" style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 'auto' }}>more options for this job</a>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 10 }}>
            Done, next job records it and sets a reminder to follow up in 5 days. The next job is already written and waiting.
          </p>
        </>
      )}
    </>
  );
}
