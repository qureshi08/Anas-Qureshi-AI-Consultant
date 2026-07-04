import ChatWidget from './components/ChatWidget';

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
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink3)', textAlign: 'right' }}>
          AI Consultant &middot; I build AI systems<br />that automate manual work
        </span>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', background: 'var(--ink)',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,253,245,0.04) 23px, rgba(255,253,245,0.04) 24px)',
        display: 'flex', alignItems: 'center', padding: '96px 40px 56px',
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', width: '100%', display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 440px' }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--brick-mid)', marginBottom: 20 }}>
              // One free AI build, no catch
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 46, color: 'var(--paper)', lineHeight: 1.12, maxWidth: 700, marginBottom: 20 }}>
              Tell me one task your team does by hand. I&apos;ll build the AI that does it, <span style={{ color: 'var(--brick-mid)' }}>free.</span>
            </h1>
            <p style={{ fontSize: 22, color: 'rgba(255,253,245,0.82)', maxWidth: 560, lineHeight: 1.5 }}>
              Pick one repetitive task you&apos;re sick of doing by hand. If it&apos;s a fit, I build a working AI system for it and hand it over.
            </p>
            <ul style={{ listStyle: 'none', marginTop: 26, display: 'flex', flexDirection: 'column', gap: 11 }}>
              {['No call needed to start.', 'You keep it, running, either way.', 'You see exactly how I work before you pay a dollar.'].map((t, i) => (
                <li key={i} style={{ fontSize: 16, color: 'rgba(255,253,245,0.82)', display: 'flex', gap: 11 }}>
                  <span style={{ color: '#EAF5EF', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: '1 1 420px', maxWidth: 540, width: '100%' }}>
            <ChatWidget />
          </div>
        </div>
      </section>
    </main>
  );
}
