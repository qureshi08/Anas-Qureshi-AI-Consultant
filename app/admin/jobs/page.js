import { createAdminClient } from '../../../lib/supabase/admin';
import CopyButton from '../../components/CopyButton';
import { RESUME_FILES } from '../../../lib/jobs/resume';
import { getSettings, buildAnswers, hiddenLanes, SETTING_FIELDS, isSet } from '../../../lib/jobs/settings';
import { refreshJobs, draftJob, draftBatch, updateJob, markApplied, setStatus, addJobByUrl, saveSettings } from '../jobs-actions';

const HOW_TO_APPLY = [
  ['Open the posting', 'Click the role title. It opens the job in a new tab.'],
  ['Find the apply button', 'LinkedIn shows either Easy Apply (a popup on LinkedIn) or Apply (jumps to the company site). Careers pages and Wellfound have their own form. Same routine either way.'],
  ['Resume', 'Every form asks for a file. Click the resume link in the row (it downloads the right variant), then upload it. If a form wants pasted text instead, use the Short bio and the resume text from the Standard answers box above.'],
  ['Contact fields', 'Name, email, phone, LinkedIn, portfolio, location: copy each from Standard answers. Never retype them.'],
  ['Cover letter or message box', 'Copy note, paste. If there is no box, the note goes to the named contact as the message instead.'],
  ['Screening questions', 'Why us, why you, first 30 days, relevant project, salary: the row has posting specific answers under Screening answers. Years of experience is 2. Notice period: your real one.'],
  ['Submit, then message the person', 'Submit the form. Back on the job page, scroll to Meet the hiring team or Job poster, click the name, Message, paste the copied message, send. No contact shown: click the company name, People, find someone in engineering or talent, message them.'],
  ['Click Applied', 'Back here, click Applied on the row. The day 5 follow up is set for you and shows at the top when due. Mismatch: click Skip.'],
];

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STATUSES = ['new', 'shortlisted', 'applied', 'replied', 'interview', 'offer', 'rejected', 'skipped'];
const STATUS_LABEL = { new: 'New', shortlisted: 'Drafted', applied: 'Applied', replied: 'Replied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', skipped: 'Skipped' };
const STATUS_COLOR = { new: 'var(--ink3)', shortlisted: 'var(--amber)', applied: 'var(--forest)', replied: 'var(--forest)', interview: 'var(--forest)', offer: 'var(--forest)', rejected: 'var(--ink3)', skipped: 'var(--ink3)' };
const LANES = ['PK-ISB', 'PK', 'Gulf', 'World'];
const LANE_LABEL = { 'PK-ISB': 'Islamabad', PK: 'Pakistan', Gulf: 'Gulf', World: 'World' };
const chip = (active, color = 'var(--ink)') => ({
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', textDecoration: 'none',
  padding: '7px 14px', border: `2px solid ${color}`, borderRadius: 8,
  color: active ? 'var(--paper)' : color, background: active ? color : 'transparent',
});
const small = { fontSize: 13, padding: '7px 10px' };
const fmt = d => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '?');

export default async function JobsPage({ searchParams }) {
  const admin = createAdminClient();
  const [{ data }, settings] = await Promise.all([
    admin.from('job_leads').select('*').order('score', { ascending: false }).order('posted_at', { ascending: false }).limit(600),
    getSettings(),
  ]);
  const all = data || [];
  const answers = buildAnswers(settings);
  const hidden = hiddenLanes(settings);
  const DAILY_GOAL = Number(settings.daily_goal) || 10;
  const settingsIncomplete = !isSet(settings.notice_period) || !isSet(settings.relocate_gulf) || !isSet(settings.relocate_pk);

  const view = searchParams?.status || 'work';
  const laneFilter = LANES.includes(searchParams?.lane) ? searchParams.lane : null;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: all.filter(j => j.status === s).length }), {});
  const appliedToday = all.filter(j => j.applied_at && j.applied_at.slice(0, 10) === today).length;
  const appliedWeek = all.filter(j => j.applied_at && j.applied_at >= weekAgo).length;
  const newToday = all.filter(j => j.first_seen === today).length;
  const due = all.filter(j => j.status === 'applied' && j.next_followup && j.next_followup <= today);

  let rows = view === 'all' ? all : view === 'work' ? all.filter(j => j.status === 'new' || j.status === 'shortlisted') : all.filter(j => j.status === view);
  if (laneFilter) rows = rows.filter(j => j.lane === laneFilter);
  else if (view === 'work' && hidden.length) rows = rows.filter(j => !hidden.includes(j.lane));
  const laneQuery = laneFilter ? `&lane=${laneFilter}` : '';

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 2 }}>Jobs</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
        Track C &middot; AI Automation Engineer &middot; floor $1,500/mo &middot; fetched daily 08:00 PKT
      </p>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 18 }}>
        Fetched from 9 public sources plus every known company board. Draft writes the cover note and the message to the named person from the posting text and the resume only. You copy, apply, click Applied. Nothing here is sent for you.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          ['Applied today', `${appliedToday} / ${DAILY_GOAL}`, appliedToday >= DAILY_GOAL ? 'var(--forest)' : 'var(--brick)'],
          ['Applied this week', appliedWeek, 'var(--ink)'],
          ['New today', newToday, 'var(--ink)'],
          ['To work', counts.new + counts.shortlisted, 'var(--ink)'],
          ['Replies', counts.replied + counts.interview + counts.offer, 'var(--forest)'],
          ['Follow ups due', due.length, due.length ? 'var(--brick)' : 'var(--ink)'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ border: '2px solid var(--ink)', borderRadius: 10, padding: '10px 12px', boxShadow: '3px 3px 0 var(--ink)', background: 'var(--paper)' }}>
            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color, lineHeight: 1.1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <form action={refreshJobs}><button className="btn" type="submit" style={small}>Refresh jobs now (about 45s)</button></form>
        <form action={draftBatch} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="hidden" name="n" value="8" />
          {laneFilter && <input type="hidden" name="lane" value={laneFilter} />}
          <button className="btn" type="submit" style={small}>Draft next 8 {laneFilter ? `(${LANE_LABEL[laneFilter]})` : ''}</button>
        </form>
        <form action={addJobByUrl} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          <input name="url" placeholder="Paste a job URL (LinkedIn alert, Wellfound, careers page)" style={{ ...small, minWidth: 320 }} required />
          <input name="title" placeholder="Title (optional)" style={{ ...small, width: 150 }} />
          <input name="company" placeholder="Company (optional)" style={{ ...small, width: 140 }} />
          <button className="btn" type="submit" style={small}>Add + draft</button>
        </form>
      </div>

      <details open={settingsIncomplete} style={{ border: `2px solid ${settingsIncomplete ? 'var(--brick)' : 'var(--ink)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, background: settingsIncomplete ? 'rgba(217,79,0,0.06)' : 'var(--paper)' }}>
        <summary className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', cursor: 'pointer', color: settingsIncomplete ? 'var(--brick)' : 'var(--ink)' }}>
          Settings {settingsIncomplete ? '(3 answers missing, drafts and answers use them)' : ''}
        </summary>
        <form action={saveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10, marginTop: 10 }}>
          {SETTING_FIELDS.map(([key, label, hint]) => (
            <label key={key} style={{ fontSize: 13 }}>
              <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 3 }}>{label}</div>
              <input name={key} defaultValue={settings[key] || ''} placeholder={hint} style={{ ...small, width: '100%', borderColor: !isSet(settings[key]) && ['notice_period', 'relocate_gulf', 'relocate_pk'].includes(key) ? 'var(--brick)' : undefined }} />
            </label>
          ))}
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit" style={small}>Save settings</button></div>
        </form>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
          Relocation set to no hides that lane from To work (the lane chips still show it). Drafts, screening answers and the standard answers below read these values.
        </p>
      </details>

      <details style={{ border: '2px solid var(--ink)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, background: 'var(--paper)' }}>
        <summary className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', cursor: 'pointer' }}>How to apply, click by click (about 3 minutes per job)</summary>
        <ol style={{ fontSize: 13, lineHeight: 1.5, margin: '10px 0 4px 18px', padding: 0 }}>
          {HOW_TO_APPLY.map(([t, d]) => <li key={t} style={{ marginBottom: 6 }}><strong>{t}.</strong> {d}</li>)}
        </ol>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(RESUME_FILES).map(([k, f]) => (
            <a key={k} href={f.path} download className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--forest)', border: '1.5px solid var(--forest)', borderRadius: 5, padding: '4px 8px', textDecoration: 'none' }}>Download resume: {f.label} (PDF)</a>
          ))}
        </div>
      </details>

      <details style={{ border: '2px solid var(--ink)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, background: 'var(--paper)' }}>
        <summary className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', cursor: 'pointer' }}>Standard form answers (copy, never retype)</summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8, marginTop: 10 }}>
          {answers.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, borderBottom: '1px dashed rgba(26,18,5,0.15)', paddingBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>{label}</div>
                <div style={{ color: /NOT SET|not set/.test(value) ? 'var(--brick)' : 'var(--ink)' }}>{value}</div>
              </div>
              <CopyButton text={value} />
            </div>
          ))}
        </div>
      </details>

      {due.length > 0 && (
        <div style={{ border: '2px solid var(--brick)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, background: 'rgba(217,79,0,0.06)' }}>
          <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--brick)', marginBottom: 6 }}>Follow ups due</div>
          {due.map(j => (
            <div key={j.id} style={{ fontSize: 13, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '3px 0' }}>
              <a href={j.url} target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>{j.title}</a>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{j.company} &middot; applied {fmt(j.applied_at)} &middot; due {j.next_followup}</span>
              {j.contact_url && <a href={j.contact_url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 10, color: 'var(--forest)' }}>contact &#8599;</a>}
              <form action={setStatus} style={{ display: 'inline' }}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="applied" /></form>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <a href={`/admin/jobs?status=work${laneQuery}`} className="mono" style={chip(view === 'work')}>To work &middot; {counts.new + counts.shortlisted}</a>
        {STATUSES.filter(s => s !== 'new' && s !== 'shortlisted').map(s => (
          <a key={s} href={`/admin/jobs?status=${s}${laneQuery}`} className="mono" style={chip(view === s, STATUS_COLOR[s])}>{STATUS_LABEL[s]} &middot; {counts[s]}</a>
        ))}
        <a href={`/admin/jobs?status=all${laneQuery}`} className="mono" style={chip(view === 'all')}>All &middot; {all.length}</a>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <a href={`/admin/jobs?status=${view}`} className="mono" style={chip(!laneFilter, 'var(--ink3)')}>Every lane</a>
        {LANES.map(l => (
          <a key={l} href={`/admin/jobs?status=${view}&lane=${l}`} className="mono" style={chip(laneFilter === l, 'var(--forest)')}>{LANE_LABEL[l]} &middot; {rows.length && laneFilter === l ? rows.length : all.filter(j => j.lane === l && (view === 'all' || (view === 'work' ? ['new', 'shortlisted'].includes(j.status) : j.status === view))).length}</a>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink3)', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
              <th style={{ padding: '10px 12px', minWidth: 230 }}>Role</th>
              <th style={{ padding: '10px 12px', minWidth: 360 }}>Cover note and message</th>
              <th style={{ padding: '10px 12px', minWidth: 240 }}>Contact, notes, status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(j => {
              const formId = `job-${j.id}`;
              return (
                <tr key={j.id} style={{ borderBottom: '1px dashed rgba(26,18,5,0.15)', verticalAlign: 'top' }}>
                  <td style={{ padding: '12px 12px' }}>
                    <a href={`/admin/jobs/${j.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', textDecoration: 'none' }}>{j.title}</a>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{j.company}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <a href={`/admin/jobs/${j.id}`} className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--paper)', background: 'var(--brick)', border: '1.5px solid var(--ink)', borderRadius: 5, padding: '4px 9px', textDecoration: 'none' }}>Open kit</a>
                      <a href={j.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink3)', border: '1.5px solid var(--ink3)', borderRadius: 5, padding: '4px 9px', textDecoration: 'none' }}>Posting &#8599;</a>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 4 }}>{j.location || 'location not stated'}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--forest)', borderRadius: 5, color: 'var(--forest)' }}>{LANE_LABEL[j.lane] || j.lane}</span>
                      <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--ink3)', borderRadius: 5, color: 'var(--ink3)' }}>score {j.score}</span>
                      <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--ink3)', borderRadius: 5, color: 'var(--ink3)' }}>{j.source}</span>
                      <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--ink3)', borderRadius: 5, color: 'var(--ink3)' }}>{fmt(j.posted_at)}</span>
                      {j.salary_label && j.salary_label !== 'unknown' && <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--amber)', borderRadius: 5, color: 'var(--amber)' }}>{j.salary_label}</span>}
                      {j.shape && j.shape !== 'unknown' && <span className="mono" style={{ fontSize: 10, padding: '2px 7px', border: '1.5px solid var(--ink3)', borderRadius: 5, color: 'var(--ink3)' }}>{j.shape}</span>}
                    </div>
                    {j.status !== 'applied' && j.status !== 'skipped' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <form action={markApplied}><input type="hidden" name="id" value={j.id} /><button className="btn" type="submit" style={{ fontSize: 12, padding: '6px 12px', background: 'var(--forest)' }}>Applied</button></form>
                        <form action={setStatus}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="skipped" /><button type="submit" className="mono" style={{ fontSize: 10, textTransform: 'uppercase', padding: '6px 10px', border: '1.5px solid var(--ink3)', borderRadius: 5, background: 'transparent', color: 'var(--ink3)', cursor: 'pointer' }}>Skip</button></form>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 13 }}>
                    {j.cover_note ? (
                      <>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>Cover note &middot; resume: {j.resume_variant === 'data' ? 'Data Analytics' : 'AI Automation'}</span>
                          <CopyButton text={j.cover_note} label="Copy note" />
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, marginBottom: 10 }}>{j.cover_note}</div>
                        {j.dm_text && (
                          <>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                              <span className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)' }}>Message to {j.contact_name || 'hiring team'}</span>
                              <CopyButton text={j.dm_text} label="Copy message" />
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, marginBottom: 8 }}>{j.dm_text}</div>
                          </>
                        )}
                        <div style={{ border: '1.5px solid var(--forest)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, background: 'rgba(45,122,79,0.05)' }}>
                          <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--forest)', marginBottom: 6 }}>Application kit</div>
                          <a href={RESUME_FILES[j.resume_variant === 'data' ? 'data' : 'ai'].path} download className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--forest)', border: '1.5px solid var(--forest)', borderRadius: 5, padding: '4px 8px', textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>
                            Download resume: {RESUME_FILES[j.resume_variant === 'data' ? 'data' : 'ai'].label}
                          </a>
                          {j.answers ? (
                            <details style={{ marginTop: 4 }}>
                              <summary className="mono" style={{ fontSize: 10, textTransform: 'uppercase', cursor: 'pointer', color: 'var(--ink)' }}>Screening answers for this posting</summary>
                              {j.answers.split('\n\n').map((block, i) => {
                                const [q, ...rest] = block.split('\n');
                                const a = rest.join('\n');
                                return (
                                  <div key={i} style={{ marginTop: 8 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{q}</span>
                                      <CopyButton text={a} label="Copy" />
                                    </div>
                                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45, fontSize: 13 }}>{a}</div>
                                  </div>
                                );
                              })}
                            </details>
                          ) : (
                            <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>Click Redraft to add screening answers (drafted before this feature).</div>
                          )}
                        </div>
                        <form action={draftJob}><input type="hidden" name="id" value={j.id} /><button type="submit" className="mono" style={{ fontSize: 10, textTransform: 'uppercase', padding: '5px 10px', border: '1.5px solid var(--ink3)', borderRadius: 5, background: 'transparent', color: 'var(--ink3)', cursor: 'pointer' }}>Redraft</button></form>
                      </>
                    ) : (
                      <>
                        {j.description && <div style={{ color: 'var(--ink3)', fontSize: 12, marginBottom: 8, maxHeight: 60, overflow: 'hidden' }}>{j.description.slice(0, 220)}...</div>}
                        <form action={draftJob}><input type="hidden" name="id" value={j.id} /><button className="btn" type="submit" style={small}>Draft cover note + message</button></form>
                      </>
                    )}
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <input type="hidden" name="id" value={j.id} form={formId} />
                    <input name="contact_name" placeholder="Contact name" defaultValue={j.contact_name || ''} style={{ ...small, width: '100%', marginBottom: 6 }} form={formId} />
                    <input name="contact_url" placeholder="Contact LinkedIn URL" defaultValue={j.contact_url || ''} style={{ ...small, width: '100%', marginBottom: 6 }} form={formId} />
                    <textarea name="notes" placeholder="Fit note, reply, next step..." defaultValue={j.notes || ''} style={{ ...small, width: '100%', minHeight: 64, resize: 'vertical', marginBottom: 6 }} form={formId} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select name="status" defaultValue={j.status} style={{ ...small, borderColor: STATUS_COLOR[j.status] }} form={formId}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      <input type="date" name="next_followup" defaultValue={j.next_followup || ''} style={small} form={formId} title="Next follow up" />
                      <button className="btn" type="submit" style={{ fontSize: 12, padding: '6px 12px' }} form={formId}>Save</button>
                    </div>
                    {j.applied_at && <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 6 }}>applied {fmt(j.applied_at)}</div>}
                    <form id={formId} action={updateJob} style={{ display: 'none' }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: 'var(--ink3)', padding: '20px 0' }}>Nothing here. Click Refresh jobs now, or paste a URL above.</p>}
      </div>
    </>
  );
}
