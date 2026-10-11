import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * FREELANCE, priority 3 (2026-10-11, 60-day lock Track 2). Only people who already asked in
 * public for something to be built: the n8n forum Jobs category (read live here), LinkedIn post
 * searches and Reddit (one click links, Reddit refuses server requests), plus the contract roles
 * the job fetcher already found. Never Upwork, never cold blasts (memory feedback_never_upwork).
 */
const card = { border: '2px solid var(--ink)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'var(--paper)' };
const btn = { fontSize: 12, fontWeight: 700, padding: '7px 12px', border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--paper)', color: 'var(--ink)', textDecoration: 'none', display: 'inline-block' };
const stepNum = { fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brick)', marginRight: 8 };

// Freelancers advertising themselves post in the same category; only client requests matter.
const SELLER_RX = /\[\s*(for hire|open to collabs?|available|offering)\s*\]|^for hire\b|\bi am (available|offering)\b|co-?founder/i;

async function n8nJobs() {
  try {
    const res = await fetch('https://community.n8n.io/c/jobs/13.json?order=created', { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return { error: `forum returned ${res.status}` };
    const data = await res.json();
    const cutoff = Date.now() - 3 * 86400000;
    const topics = (data.topic_list?.topics || [])
      .filter(t => !t.pinned && new Date(t.created_at).getTime() >= cutoff && !SELLER_RX.test(t.title || ''))
      .map(t => ({ id: t.id, title: t.title, url: `https://community.n8n.io/t/${t.slug}/${t.id}`, hours: Math.round((Date.now() - new Date(t.created_at).getTime()) / 3600000), replies: Math.max(0, (t.posts_count || 1) - 1) }));
    return { topics };
  } catch (e) {
    return { error: e.message };
  }
}

const li = q => `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(q)}&datePosted=%22past-24h%22&sortBy=%22date_posted%22`;
const LINKEDIN = ['looking for n8n developer', 'need an automation expert', 'hiring AI automation freelancer', 'anyone who can build an AI agent', 'looking for someone to build an AI chatbot'];
const REDDIT = [
  ['r/forhire, Hiring posts', 'https://www.reddit.com/r/forhire/search/?q=flair%3AHiring&restrict_sr=1&sort=new'],
  ['r/n8n, newest', 'https://www.reddit.com/r/n8n/new/'],
  ['r/automation, newest', 'https://www.reddit.com/r/automation/new/'],
];

export default async function Freelance() {
  const admin = createAdminClient();
  const [forum, { data: contracts }] = await Promise.all([
    n8nJobs(),
    admin.from('job_leads').select('id, title, company, location, posted_at, contact_email, cover_note')
      .eq('shape', 'contract').in('status', ['new', 'shortlisted']).not('lane', 'in', '(Training,Startups)')
      .order('score', { ascending: false }).limit(15),
  ]);

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: '0 0 4px' }}>Freelance: 3 replies + 2 contract applications</h2>
      <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '0 0 16px' }}>
        Priority 3, after Gulf jobs and startup roles. Only answer people who already asked in public. A good reply names their exact task, says in two sentences how you would build it, points to one real thing you shipped (ZATCA for a KSA bank, the UAE and KSA reporting pipeline, the AI recruitment portal, or the live assistant on your site), and asks one question about their setup. Log the counts in the scoreboard at the end.
      </p>

      <div style={card}>
        <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>1</span><strong>n8n forum: client requests from the last 3 days</strong> (freelancers advertising themselves are hidden)</div>
        {forum.error && <p style={{ fontSize: 13, color: 'var(--brick)' }}>Could not read the forum ({forum.error}). <a href="https://community.n8n.io/c/jobs/13?order=created">Open it directly &#8599;</a></p>}
        {forum.topics && !forum.topics.length && <p style={{ fontSize: 13, color: 'var(--ink3)' }}>No new client requests in the last 3 days. Move on to step 2.</p>}
        {(forum.topics || []).map(t => (
          <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid rgba(26,18,5,0.12)' }}>
            <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{t.title} &#8599;</a>
            <span className="mono" style={{ fontSize: 10, color: t.replies < 3 ? 'var(--forest)' : 'var(--ink3)' }}>{t.hours}h ago &middot; {t.replies} replies{t.replies < 3 ? ', good odds' : ''}</span>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>2</span><strong>LinkedIn posts from the last 24 hours</strong>. Reply or comment in a few sentences that name their task.</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LINKEDIN.map(q => <a key={q} href={li(q)} target="_blank" rel="noreferrer" style={btn}>&quot;{q}&quot; &#8599;</a>)}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>3</span><strong>Reddit, newest first</strong>. Hiring posts or people asking how to get something built; follow each subreddit&apos;s rules.</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {REDDIT.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer" style={btn}>{label} &#8599;</a>)}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 15, marginBottom: 8 }}><span style={stepNum}>4</span><strong>Contract roles the job fetcher found</strong>. Apply to 2. Each opens the full kit (tailored resume, cover note, email).</div>
        {!(contracts || []).length && <p style={{ fontSize: 13, color: 'var(--ink3)' }}>No open contract roles right now. The daily fetch adds new ones every morning.</p>}
        {(contracts || []).map(j => (
          <div key={j.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', padding: '6px 0', borderTop: '1px solid rgba(26,18,5,0.12)' }}>
            <a href={`/admin/jobs/${j.id}`} style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{j.title}</a>
            <span style={{ fontSize: 13 }}>{j.company}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{j.location || ''}{j.contact_email ? ' · email ready' : ''}{j.cover_note ? ' · written' : ' · not written yet'}</span>
          </div>
        ))}
      </div>
    </>
  );
}
