import ChatWidget from './components/ChatWidget';

const CASES = [
  {
    industry: 'FMCG · Retail Analytics, UAE & KSA',
    title: 'A monthly reporting pipeline that used to take a week',
    metric: '7 days → 2 hours',
    metricLabel: 'full monthly refresh, UAE & KSA retail data',
    color: 'brick',
    desc: 'Every month, raw SKU-level data poured in from retailers across the UAE and KSA, sales, quantity, volume, raw cases, manufacturer and competitor detail, broken down by region, store, and location. I built the whole pipeline end to end on one role based platform: data harmonized and validated automatically, pushed into a central database, Tableau dashboards and Excel reports refreshed on trigger, AI doing the matching and analysis work inside it. What took the team a week before anyone could make a decision now refreshes in about 2 hours.',
    stack: ['Python', 'Gemini', 'Tableau', 'Docker'],
  },
  {
    industry: 'Regulated Finance · Risk',
    title: '20+ credit risk models, automated end to end',
    metric: '~75% less manual effort',
    metricLabel: 'across the whole model suite',
    color: 'forest',
    desc: 'In a regulated finance environment, 20+ credit risk models (PD, LGD, EAD, ECL) ran by hand across linked spreadsheets. I rebuilt all of them in Python and SQL and centralized every input into one relational database. Version conflicts gone, every calculation traceable.',
    stack: ['Python', 'SQL', 'Docker'],
  },
  {
    industry: 'Hiring · Internal Tools',
    title: 'Three tools and a mess, collapsed into one platform',
    metric: '−60% coordination time',
    metricLabel: 'getting a candidate through the pipeline',
    color: 'ink',
    desc: 'Hiring ran across a notes app, spreadsheets, and manual email with no source of truth. I built one role based web app: candidate tracking, assessment scheduling, permissions, resume uploads, plus an automation layer for the repetitive follow ups. Response time dropped about 2 days, shortlist consistency rose 35%.',
    stack: ['Next.js', 'Supabase', 'AI Scoring', 'Automation'],
  },
  {
    industry: 'Banking · Compliance',
    title: 'Core banking, wired into government e-invoicing',
    metric: 'Phase 2 compliant',
    metricLabel: 'regulator mandated e-invoicing',
    color: 'amber',
    desc: 'Integrated a core banking system with a national e-invoicing mandate for automated, regulation compliant invoice clearance, plus compliance tooling across two other business platforms. Generation, validation, and submission, end to end, with zero manual clearance steps.',
    stack: ['Core Banking', 'E-invoicing', 'Integrations'],
  },
  {
    industry: 'Local Service Businesses · Gulf & Pakistan',
    title: 'A WhatsApp receptionist that never sleeps',
    metric: '< 5 sec first reply',
    metricLabel: '24 hours a day, every day',
    color: 'forest',
    desc: 'Clinics, salons, and restaurants lose bookings to whoever answers WhatsApp first, and nobody answers at 11pm. I built an AI receptionist that reads the business\'s own information, answers instantly around the clock, and hands off to a human the moment it is unsure. This is the live system behind my current offer, not a mockup.',
    stack: ['WhatsApp API', 'LLM', 'Node.js'],
  },
  {
    industry: 'Sales Operations · Outbound',
    title: 'An outreach engine that replaced a paid lead database',
    metric: '1,000+ messages',
    metricLabel: 'sourced, personalized, and sent, with zero manual research',
    color: 'brick',
    desc: 'Cold outreach used to mean paying for a lead database and writing every message by hand. I built a pipeline that finds businesses from public sources, verifies real contact details, writes a genuinely personalized opener for each one, and tracks every reply, all without a single paid subscription.',
    stack: ['Python', 'Scraping', 'AI Personalization', 'Supabase'],
  },
];

const SKILLS = [
  ['brick', 'Python / SQL'],
  ['brick', 'AI / LLMs · Gemini, Groq'],
  ['forest', 'Next.js / React'],
  ['forest', 'Node.js / Supabase'],
  ['amber', 'n8n / Automation'],
  ['amber', 'Tableau / Power BI'],
];

const COLORS = {
  brick: { text: 'var(--brick)', shadow: 'var(--brick)', tagBg: 'var(--brick-light)' },
  forest: { text: 'var(--forest)', shadow: 'var(--forest)', tagBg: 'var(--forest-light)' },
  amber: { text: 'var(--amber)', shadow: 'var(--amber)', tagBg: 'var(--amber-light)' },
  ink: { text: 'var(--ink)', shadow: 'var(--ink)', tagBg: 'var(--paper3)' },
};

function CaseCard({ c }) {
  const col = COLORS[c.color];
  return (
    <div className="card" style={{ flex: '1 1 320px', boxShadow: `4px 4px 0 ${col.shadow}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: col.text }}>{c.industry}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--ink)', lineHeight: 1.15 }}>{c.title}</h3>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, color: col.text, lineHeight: 1 }}>{c.metric}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{c.metricLabel}</div>
      </div>
      <p style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.5 }}>{c.desc}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 }}>
        {c.stack.map((s) => (
          <span key={s} className="mono" style={{
            fontSize: 10.5, letterSpacing: '.04em', color: col.text, background: col.tagBg,
            border: `1.5px solid ${col.text}`, borderRadius: 20, padding: '3px 10px',
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 52,
        background: 'rgba(255,253,245,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '2px solid var(--ink)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--ink)' }}>
          Anas<span style={{ color: 'var(--brick)', fontFamily: 'var(--font-mono)', fontSize: 20 }}>.</span>Qureshi
        </span>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="#work" className="mono" style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink2)', textDecoration: 'none' }}>Work</a>
          <a href="#about" className="mono" style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink2)', textDecoration: 'none' }}>About</a>
          <a href="#assistant" className="mono" style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink2)', textDecoration: 'none' }}>Ask AI</a>
          <a href="#contact" className="mono" style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink2)', textDecoration: 'none' }}>Contact</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '86vh', background: 'var(--ink)',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,253,245,0.04) 23px, rgba(255,253,245,0.04) 24px)',
        display: 'flex', alignItems: 'center', padding: '96px 40px 56px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--brick-mid)', marginBottom: 20 }}>
            // Portfolio · AI Consultant
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 48, color: 'var(--paper)', lineHeight: 1.12, marginBottom: 20 }}>
            Every unanswered WhatsApp message is a customer walking to your competitor.
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(255,253,245,0.82)', maxWidth: 680, lineHeight: 1.5, marginBottom: 26 }}>
            Every customer who messages you gets an answer in seconds, day or night, and the booking
            stays with you. I measure your reply time and WhatsApp bookings before and after 14 days,
            so you see the difference in your own numbers. Built with the same discipline as the retail,
            finance, and banking systems below. If it doesn&apos;t handle 8 of 10 real inquiries
            correctly in that time, you pay nothing.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 30 }}>
            {['Retail', 'Regulated Finance', 'Banking & Compliance', 'HR Tech', 'Home & Local Services', 'Sales Ops'].map((t) => (
              <span key={t} className="mono" style={{
                fontSize: 11, letterSpacing: '.04em', color: 'var(--paper)', border: '1.5px solid rgba(255,253,245,0.4)',
                borderRadius: 20, padding: '4px 12px',
              }}>{t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="#work" className="btn">See the work</a>
            <a href="#assistant" style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--paper)',
              border: '2.5px solid rgba(255,253,245,0.5)', borderRadius: 8, padding: '11px 24px', textDecoration: 'none',
            }}>Ask my AI assistant</a>
          </div>
        </div>
      </section>

      {/* WORK */}
      <section id="work" style={{ background: 'var(--paper)', padding: '64px 40px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="tag">Real systems, real outcomes</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, color: 'var(--ink)', margin: '6px 0 8px' }}>
            Problems I&apos;ve actually solved.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink2)', maxWidth: 620, marginBottom: 28 }}>
            Client names and specifics stay confidential. The problems, the systems, and the outcomes are real.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {CASES.map((c) => <CaseCard key={c.title} c={c} />)}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ background: 'var(--paper2)', padding: '64px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="tag">About</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, color: 'var(--ink)', margin: '6px 0 20px' }}>
            I&apos;m Anas.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 14 }}>
            I turn manual operations into systems that run on their own. Not theory, real automations and
            custom apps, with a background building enterprise systems across data, finance, and compliance.
          </p>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 14 }}>
            A lot of that work has been enterprise grade: data pipelines, risk systems, compliance
            integrations, internal platforms. Now I build that same caliber of system for growing
            businesses, without the enterprise price tag or the six month timeline.
          </p>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 26 }}>
            If your business loses hours every week to work a machine should be doing, that is exactly
            what I fix. I build it myself, hand it over properly, and I do not disappear after the invoice.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {SKILLS.map(([color, name]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: `var(--${color})`, display: 'inline-block' }} />
                <span style={{ fontSize: 15, color: 'var(--ink)' }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASSISTANT */}
      <section id="assistant" style={{ background: 'var(--paper)', padding: '64px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px' }}>
            <div className="tag">The assistant on this page</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--ink)', margin: '6px 0 16px' }}>
              Have a question about my work, or one of your own?
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink2)', lineHeight: 1.55, marginBottom: 14 }}>
              I built the assistant to the right, and it is living proof of the kind of system I build.
              Ask it about any project above, what something like it would cost, or hand it a task you
              are sick of doing by hand.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {['Trained on my own work, nothing invented.', 'Books a free 15 minute call if you want one.', 'Or leave your email, I follow up personally.'].map((t, i) => (
                <li key={i} style={{ fontSize: 15, color: 'var(--ink2)', display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--forest)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '1 1 420px', maxWidth: 540, width: '100%' }}>
            <ChatWidget />
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" style={{ background: 'var(--ink)', padding: '40px 40px 28px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: 'var(--paper)', marginBottom: 14 }}>
            Have a problem worth handing over?
          </h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 30 }}>
            <a href="mailto:muhammadanasq@gmail.com" className="btn">muhammadanasq@gmail.com</a>
            <a href="https://calendly.com/muhammadanasq/free-15-min-audit" target="_blank" rel="noreferrer" style={{
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--paper)',
              border: '2.5px solid rgba(255,253,245,0.5)', borderRadius: 8, padding: '11px 24px', textDecoration: 'none',
            }}>Book a free 15 min call</a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 20, borderTop: '1px solid rgba(255,253,245,0.15)' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--paper)' }}>
              Anas<span style={{ color: 'var(--brick-mid)', fontFamily: 'var(--font-mono)' }}>.</span>Qureshi
            </span>
            <span className="mono" style={{ fontSize: 9, letterSpacing: '.08em', color: 'rgba(255,253,245,0.35)', textTransform: 'uppercase' }}>
              © 2026 Anas Qureshi · AI Consultant
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
