import ChatWidget from './components/ChatWidget';

// Job search page (2026-10-29, Anas: "this page still has the WhatsApp pitch, too much detail, make it
// so I can get a job"). Hiring managers land here from the resume, so it says who he is, five proofs
// and how to reach him. Every fact comes from Jobs/resume/resume_source.md.
// Style: Guidelines/tech_reel_style.md.
const WORK = [
  {
    area: 'banking · credit risk',
    metric: '6 weeks → 48 hours',
    title: 'IFRS 9 credit loss product, built from bank automation',
    line: 'Automated 20+ Excel credit risk models for ZTBL, a development bank, in Python and SQL, then started the ECL Calculator, now on Microsoft AppSource with a methodology co developed with KPMG.',
    stack: ['Python', 'SQL', 'Docker'],
    color: 'var(--brick)',
  },
  {
    area: 'retail · uae and ksa',
    metric: '7 days → 2 hours',
    title: 'Monthly retail reporting for PepsiCo',
    line: 'One pipeline across 13 retailers with AI assisted SKU matching, automated refresh and validation, and Tableau dashboards.',
    stack: ['Python', 'Gemini', 'Tableau'],
    color: 'var(--forest)',
  },
  {
    area: 'ai agents · pilot',
    metric: '20 / 20',
    title: 'Text to SQL agent on a self hosted model',
    line: 'Plain language questions become SQL on credit loss data, read only through an MCP server, each bank isolated, every query audited. A pilot on synthetic data.',
    stack: ['MCP', 'SQL Server', 'Local LLM'],
    color: 'var(--brick)',
  },
  {
    area: 'hiring · in production',
    metric: 'Gemini + vision',
    title: 'AI recruitment portal',
    line: 'Screens resumes with Gemini, including image only PDFs, with role based access for four roles, Microsoft sign in and audit logs.',
    stack: ['Next.js', 'Supabase', 'Gemini API'],
    color: 'var(--forest)',
  },
  {
    area: 'tax compliance · saudi arabia',
    metric: '6 / 6 APIs',
    title: 'ZATCA e-invoicing gateway',
    line: 'Connects accounting software (Odoo and Zoho) to ZATCA Phase 2: signed invoices, hash chaining, clearance and reporting, multi tenant.',
    stack: ['TypeScript', 'Next.js', 'Odoo', 'Zoho'],
    color: 'var(--brick)',
  },
];

const SKILLS = ['Python', 'SQL', 'LLMs and agents', 'MCP', 'REST APIs', 'Docker', 'Next.js', 'NestJS'];
const LINKS = {
  email: 'mailto:muhammadanasq@gmail.com',
  linkedin: 'https://linkedin.com/in/anasqureshiai',
  resume: '/resume.pdf',
};

const hud = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--grey)', marginBottom: 18 };
const h2 = { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--ink)', lineHeight: 1.08, letterSpacing: '-.02em' };
const ghost = {
  fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', background: 'var(--paper)',
  borderRadius: 999, padding: '12px 22px', textDecoration: 'none', boxShadow: 'var(--shadow)',
};
const navLink = { fontSize: 12, color: 'var(--ink2)', textDecoration: 'none', whiteSpace: 'nowrap' };

function Hud({ n, name, right, rightColor = 'var(--brick)' }) {
  return (
    <div style={hud}>
      <span>// {n} · {name}</span>
      {right && <span style={{ color: rightColor, textTransform: 'uppercase', letterSpacing: '.04em' }}>{right}</span>}
    </div>
  );
}

function WorkCard({ w }) {
  return (
    <div className="card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 10, padding: 24 }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--grey)' }}>// {w.area}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: w.color, lineHeight: 1, letterSpacing: '-.02em' }}>{w.metric}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink)', lineHeight: 1.2 }}>{w.title}</h3>
      <p style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.55 }}>{w.line}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 4 }}>
        {w.stack.map((s) => <span key={s} className="chip">{s}</span>)}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 56,
        background: 'rgba(238,233,214,0.86)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 max(16px, 4vw)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--ink)', letterSpacing: '-.02em' }}>
          Anas<span style={{ color: 'var(--brick)' }}>.</span>Qureshi
        </span>
        <div className="mono nav-links" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="#work" style={navLink}>work</a>
          <a href="#assistant" style={navLink}>ask ai</a>
          <a href={LINKS.resume} style={navLink}>resume</a>
          <a href="#contact" style={navLink}>contact</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '78vh', display: 'flex', alignItems: 'center', padding: '110px max(16px, 5vw) 56px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', width: '100%' }}>
          <Hud n="00" name="ai implementation engineer" right="open to roles in saudi arabia" rightColor="var(--forest)" />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(34px, 6vw, 62px)', color: 'var(--ink)', lineHeight: 1.04, letterSpacing: '-.025em', marginBottom: 22 }}>
            I build AI into the systems companies <span className="em" style={{ fontWeight: 700 }}>already run.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink2)', maxWidth: 640, lineHeight: 1.6, marginBottom: 24 }}>
            AI Implementation Engineer at Convergent Business Technologies since 2024, building LLM integrations, agents
            and data pipelines for banking, retail and tax compliance work in Saudi Arabia, the UAE and Pakistan.
            Based in Islamabad and ready to relocate to Riyadh.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 28 }}>
            {SKILLS.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={LINKS.resume} className="btn">Download resume</a>
            <a href={LINKS.email} style={ghost}>Email me</a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" style={ghost}>LinkedIn</a>
          </div>
        </div>
      </section>

      {/* WORK */}
      <section id="work" style={{ padding: '48px max(16px, 5vw) 64px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Hud n="01" name="selected work" right={`${WORK.length} systems`} />
          <h2 style={{ ...h2, margin: '0 0 28px' }}>
            Systems I <span className="em">built.</span>
          </h2>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {WORK.map((w) => <WorkCard key={w.title} w={w} />)}
          </div>
        </div>
      </section>

      {/* ASSISTANT */}
      <section id="assistant" style={{ padding: '48px max(16px, 5vw) 64px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px' }}>
            <Hud n="02" name="ask my assistant" right="live" rightColor="var(--forest)" />
            <h2 style={{ ...h2, fontSize: 'clamp(26px, 3.4vw, 34px)', margin: '0 0 14px' }}>
              Questions about my <span className="em">work?</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink2)', lineHeight: 1.6 }}>
              I built this assistant. Ask it about any project, my stack or my availability. It answers from my real record.
            </p>
          </div>
          <div style={{ flex: '1 1 420px', maxWidth: 540, width: '100%' }}>
            <ChatWidget />
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" style={{ background: 'var(--dark)', padding: '48px max(16px, 5vw) 28px', marginTop: 32 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ ...hud, color: 'rgba(255,254,250,.5)' }}><span>// 03 · contact</span></div>
          <h2 style={{ ...h2, color: '#FFFEFA', fontSize: 'clamp(26px, 3.6vw, 36px)', marginBottom: 18 }}>
            Hiring for AI integration in <span className="em" style={{ color: 'var(--brick-mid)' }}>Saudi Arabia?</span>
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            <a href={LINKS.email} className="btn">muhammadanasq@gmail.com</a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" style={{ ...ghost, background: 'rgba(255,254,250,.08)', color: '#FFFEFA', boxShadow: 'none' }}>LinkedIn</a>
            <a href={LINKS.resume} style={{ ...ghost, background: 'rgba(255,254,250,.08)', color: '#FFFEFA', boxShadow: 'none' }}>Resume (PDF)</a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,254,250,0.12)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#FFFEFA' }}>
              Anas<span style={{ color: 'var(--brick-mid)' }}>.</span>Qureshi
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'rgba(255,254,250,0.4)' }}>
              © 2026 Anas Qureshi · AI Implementation Engineer
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
