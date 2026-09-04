import { createAdminClient } from '../../../../../lib/supabase/admin';
import { CONTACT, HEADLINES, SKILLS, EXPERIENCE, EDUCATION, projectById, DEFAULT_ORDER } from '../../../../../lib/jobs/resumeData';
import PrintButton from '../../../../components/PrintButton';

export const dynamic = 'force-dynamic';

/**
 * The tailored resume for one job, as a clean ATS friendly page. Every bullet comes from
 * lib/jobs/resumeData.js; the draft only chooses order, the leading skills and the summary,
 * so nothing here can be invented. Print to PDF from the browser to get the file to upload.
 */
export default async function TailoredResume({ params }) {
  const admin = createAdminClient();
  const { data: job } = await admin.from('job_leads').select('*').eq('id', params.id).single();
  if (!job) return <p style={{ padding: 24 }}>Job not found.</p>;

  const variant = job.resume_variant === 'data' ? 'data' : 'ai';
  const plan = job.resume_plan || {};
  const order = Array.isArray(plan.project_order) && plan.project_order.length ? plan.project_order : DEFAULT_ORDER[variant];
  const projects = order.map(projectById).filter(Boolean).slice(0, 6);
  const lead = Array.isArray(plan.skills_lead) ? plan.skills_lead : [];
  const summary = plan.summary || 'AI Consultant at Convergent Business Technologies since 2024, building automation and AI systems that remove manual work from finance, compliance and recruiting workflows using Python, SQL, n8n and LLMs. Shipped a production recruitment portal on Next.js and Supabase, and an LLM assisted SKU mapping pipeline that cut mapping time from 80 minutes to 40 seconds per 100 SKUs.';

  // Leading skills first, then the rest of each group, nothing invented.
  const groups = Object.entries(SKILLS).map(([g, items]) => {
    const inLead = lead.filter(l => items.some(i => i.toLowerCase() === l.toLowerCase()));
    const rest = items.filter(i => !inLead.some(l => l.toLowerCase() === i.toLowerCase()));
    return [g, [...inLead, ...rest]];
  });

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh' }}>
      <style>{`
        @page { size: A4; margin: 14mm; }
        .sheet { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.38; color: #111; max-width: 190mm; margin: 0 auto; padding: 18px 22px 60px; }
        .sheet h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: .3px; }
        .sheet h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1.1px; border-bottom: 1px solid #999; padding-bottom: 2px; margin: 14px 0 7px; }
        .sheet ul { margin: 4px 0 0; padding-left: 17px; }
        .sheet li { margin-bottom: 2.5px; }
        .sheet .role { font-weight: 700; }
        .sheet .muted { color: #444; }
        .noprint { position: sticky; top: 0; background: #f4f4f4; border-bottom: 1px solid #ccc; padding: 10px 22px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-family: Calibri, Arial, sans-serif; font-size: 13px; }
        @media print { .noprint { display: none !important; } .sheet { padding: 0; max-width: none; } }
      `}</style>

      <div className="noprint">
        <PrintButton auto />
        <span>The save box opens by itself. Choose <strong>Save as PDF</strong>, name it <strong>Muhammad_Anas_{(job.company || 'Resume').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 30)}.pdf</strong>, then upload that file. Did not open? Press the button.</span>
        <a href="/admin/jobs" style={{ marginLeft: 'auto', color: '#0a5' }}>Back to jobs</a>
      </div>

      <div className="sheet">
        <h1>{CONTACT.name}</h1>
        <div style={{ fontWeight: 600, marginBottom: 3 }}>{HEADLINES[variant]}</div>
        <div className="muted" style={{ fontSize: '9.5pt' }}>
          {CONTACT.email} | {CONTACT.phone} | {CONTACT.linkedin} | {CONTACT.site} | {CONTACT.location}
        </div>

        <h2>Summary</h2>
        <div>{summary}</div>

        <h2>Skills</h2>
        {groups.map(([g, items]) => (
          <div key={g}><span className="role">{g}:</span> {items.join(', ')}</div>
        ))}

        <h2>Experience</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="role">{EXPERIENCE.company}</span><span className="muted">{EXPERIENCE.dates}</span>
        </div>
        <div className="muted" style={{ fontStyle: 'italic' }}>{EXPERIENCE.title}</div>
        <ul>{EXPERIENCE.bullets.map(b => <li key={b}>{b}</li>)}</ul>

        <h2>Projects</h2>
        {projects.map(p => (
          <div key={p.id} style={{ marginBottom: 9, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="role">{p.name}</span><span className="muted">{p.year}</span>
            </div>
            <div className="muted" style={{ fontStyle: 'italic', fontSize: '9.5pt' }}>Stack: {p.stack}</div>
            <ul>{p.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          </div>
        ))}

        <h2>Education</h2>
        <div>{EDUCATION}</div>
      </div>
    </div>
  );
}
