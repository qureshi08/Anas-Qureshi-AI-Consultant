import { createAdminClient } from '../../../../lib/supabase/admin';
import CopyButton from '../../../components/CopyButton';
import { getSettings, buildAnswers } from '../../../../lib/jobs/settings';
import { draftJob, updateJob, markApplied, setStatus } from '../../jobs-actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STATUSES = ['new', 'shortlisted', 'applied', 'replied', 'interview', 'offer', 'rejected', 'skipped'];
const STATUS_LABEL = { new: 'New', shortlisted: 'Drafted', applied: 'Applied', replied: 'Replied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', skipped: 'Skipped' };
const small = { fontSize: 13, padding: '7px 10px' };

const card = { border: '2px solid var(--ink)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: 'var(--paper)', boxShadow: '3px 3px 0 var(--ink)' };
const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', marginBottom: 6 };
const linkBtn = { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--forest)', border: '1.5px solid var(--forest)', borderRadius: 6, padding: '6px 10px', textDecoration: 'none', display: 'inline-block' };

// Deterministic people search URLs, no API needed: LinkedIn's own search with the company name.
function peopleSearch(company, role) {
  const q = encodeURIComponent(`${company || ''} ${role || ''}`.trim());
  return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
}

export default async function JobKit({ params }) {
  const admin = createAdminClient();
  const [{ data: job }, settings] = await Promise.all([
    admin.from('job_leads').select('*').eq('id', params.id).single(),
    getSettings(),
  ]);
  if (!job) return <p>Job not found. <a href="/admin/jobs">Back to jobs</a></p>;
  const answers = buildAnswers(settings);
  const contactFirst = (job.contact_name || '').split(' ')[0];
  const emailBody = job.email_body || '';
  const mailto = job.contact_email ? `mailto:${job.contact_email}?subject=${encodeURIComponent(job.email_subject || `Application: ${job.title}`)}&body=${encodeURIComponent(emailBody)}` : null;

  return (
    <>
      <a href="/admin/jobs" className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textDecoration: 'none' }}>&larr; All jobs</a>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', margin: '6px 0 2px' }}>{job.title}</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14 }}>
        {job.company} &middot; {job.location || 'location not stated'} &middot; {job.lane} &middot; score {job.score} &middot; {job.source}
      </p>

      {/* 1. The job */}
      <div style={card}>
        <div className="mono" style={label}>1. The job</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={job.url} target="_blank" rel="noreferrer" className="mono" style={linkBtn}>Open posting &#8599;</a>
          {job.company && <a href={`https://www.google.com/search?q=${encodeURIComponent(job.company + ' careers')}`} target="_blank" rel="noreferrer" className="mono" style={linkBtn}>Company careers page &#8599;</a>}
          <CopyButton text={job.url} label="Copy job link" />
          {job.salary_label && job.salary_label !== 'unknown' && <span className="mono" style={{ fontSize: 11, color: 'var(--amber)' }}>{job.salary_label}</span>}
        </div>
        {job.notes && <div style={{ fontSize: 13, marginTop: 10, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{job.notes}</div>}
      </div>

      {/* Resume is ALWAYS available: it renders from real resume data with a sensible default
          order even when this job has not been drafted yet. Anas hit a dead end here once. */}
      <div style={card}>
        <div className="mono" style={label}>2. Resume for this job</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`/admin/jobs/${job.id}/resume`} target="_blank" rel="noreferrer" className="mono" style={{ ...linkBtn, background: 'var(--forest)', color: 'var(--paper)' }}>Open resume, save box opens by itself &#8599;</a>
          <a href={`/resume/Muhammad_Anas_${job.resume_variant === 'data' ? 'Data_Analytics' : 'AI_Automation'}_Engineer.pdf`} download className="mono" style={linkBtn}>Download ready made PDF</a>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
          The first one is built for this posting and saves as a PDF from your browser. The second is the standard file, one click, use it when you are in a hurry.
        </p>
      </div>

      {!job.cover_note ? (
        <div style={{ ...card, borderColor: 'var(--brick)' }}>
          <div className="mono" style={{ ...label, color: 'var(--brick)' }}>Not drafted yet</div>
          {(() => {
            const line = (job.notes || '').split('\n').reverse().find(l => l.includes('DRAFT FAILED'));
            return line ? <p style={{ fontSize: 13, color: 'var(--brick)', marginBottom: 10 }}>Last try failed: {line.replace(/^\[[^\]]*\]\s*DRAFT FAILED:\s*/, '').slice(0, 200)}</p> : null;
          })()}
          <form action={draftJob}><input type="hidden" name="id" value={job.id} /><button className="btn" type="submit" style={small}>Draft everything for this job</button></form>
        </div>
      ) : (
        <>
          {/* 3. Cover letter */}
          <div style={card}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div className="mono" style={{ ...label, marginBottom: 0 }}>3. Cover letter for this job</div>
              <CopyButton text={job.cover_note} label="Copy" />
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>{job.cover_note}</div>
          </div>

          {/* 4. The person */}
          <div style={card}>
            <div className="mono" style={label}>4. The person to contact {job.contact_role ? `(likely: ${job.contact_role})` : ''}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {job.contact_url && <a href={job.contact_url} target="_blank" rel="noreferrer" className="mono" style={{ ...linkBtn, background: 'var(--forest)', color: 'var(--paper)' }}>Open {job.contact_name || 'contact'} &#8599;</a>}
              <a href={peopleSearch(job.company, job.contact_role || 'hiring manager')} target="_blank" rel="noreferrer" className="mono" style={linkBtn}>Find hiring manager on LinkedIn &#8599;</a>
              <a href={peopleSearch(job.company, 'talent acquisition recruiter')} target="_blank" rel="noreferrer" className="mono" style={linkBtn}>Find a recruiter &#8599;</a>
              {job.company && <a href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(job.company)}`} target="_blank" rel="noreferrer" className="mono" style={linkBtn}>Company page &#8599;</a>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>LinkedIn message{contactFirst ? ` to ${contactFirst}` : ''}</span>
              <CopyButton text={job.dm_text || ''} label="Copy message" />
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14, marginBottom: 12 }}>{job.dm_text}</div>

            {(job.email_subject || emailBody) && (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>Email version</span>
                  <CopyButton text={job.email_subject || ''} label="Copy subject" />
                  <CopyButton text={emailBody} label="Copy body" />
                  {mailto && <a href={mailto} className="mono" style={linkBtn}>Open in mail app &#8599;</a>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>Subject: {job.email_subject}</div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>{emailBody}</div>
              </>
            )}
          </div>

          {/* 5. Form answers */}
          <div style={card}>
            <div className="mono" style={label}>5. Answers the form will ask for</div>
            {job.answers && job.answers.split('\n\n').map((block, i) => {
              const [q, ...rest] = block.split('\n');
              const a = rest.join('\n');
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{q}</span>
                    <CopyButton text={a} label="Copy" />
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: 13 }}>{a}</div>
                </div>
              );
            })}
            <details style={{ marginTop: 6 }}>
              <summary className="mono" style={{ fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', color: 'var(--ink3)' }}>Standard fields (name, email, phone, salary, notice period)</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
                {answers.map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, borderBottom: '1px dashed rgba(26,18,5,0.15)', paddingBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>{l}</div>
                      <div style={{ color: /not set|NOT SET/.test(v) ? 'var(--brick)' : 'var(--ink)' }}>{v}</div>
                    </div>
                    <CopyButton text={v} />
                  </div>
                ))}
              </div>
            </details>
          </div>
        </>
      )}

      {/* 6. Done */}
      <div style={card}>
        <div className="mono" style={label}>6. When it is sent</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <form action={markApplied}><input type="hidden" name="id" value={job.id} /><button className="btn" type="submit" style={{ ...small, background: 'var(--forest)' }}>Mark applied (sets day 5 follow up)</button></form>
          <form action={setStatus}><input type="hidden" name="id" value={job.id} /><input type="hidden" name="status" value="skipped" /><button type="submit" className="mono" style={{ ...linkBtn, borderColor: 'var(--ink3)', color: 'var(--ink3)', cursor: 'pointer', background: 'transparent' }}>Skip this one</button></form>
          <form action={draftJob}><input type="hidden" name="id" value={job.id} /><button type="submit" className="mono" style={{ ...linkBtn, borderColor: 'var(--ink3)', color: 'var(--ink3)', cursor: 'pointer', background: 'transparent' }}>Redraft everything</button></form>
        </div>
        <form action={updateJob} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <input type="hidden" name="id" value={job.id} />
          <label style={{ fontSize: 13 }}><div className="mono" style={label}>Contact name</div><input name="contact_name" defaultValue={job.contact_name || ''} style={{ ...small, width: '100%' }} /></label>
          <label style={{ fontSize: 13 }}><div className="mono" style={label}>Contact LinkedIn URL</div><input name="contact_url" defaultValue={job.contact_url || ''} style={{ ...small, width: '100%' }} /></label>
          <label style={{ fontSize: 13 }}><div className="mono" style={label}>Status</div>
            <select name="status" defaultValue={job.status} style={{ ...small, width: '100%' }}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          </label>
          <label style={{ fontSize: 13 }}><div className="mono" style={label}>Next follow up</div><input type="date" name="next_followup" defaultValue={job.next_followup || ''} style={{ ...small, width: '100%' }} /></label>
          <label style={{ fontSize: 13, gridColumn: '1 / -1' }}><div className="mono" style={label}>Notes</div><textarea name="notes" defaultValue={job.notes || ''} style={{ ...small, width: '100%', minHeight: 60 }} /></label>
          <div><button className="btn" type="submit" style={small}>Save</button></div>
        </form>
      </div>
    </>
  );
}
