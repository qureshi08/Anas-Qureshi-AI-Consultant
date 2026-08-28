'use client';

import { useState } from 'react';
import { VERDICT } from './benchmarks';

const PHASES = [
  { n: 1, title: 'POSITION', sub: 'who you are',        x: 20,   w: 268 },
  { n: 2, title: 'FIND',     sub: 'get names',          x: 308,  w: 248 },
  { n: 3, title: 'REACH',    sub: 'get in front',       x: 576,  w: 320 },
  { n: 4, title: 'CONVERT',  sub: 'start a talk',       x: 916,  w: 248 },
  { n: 5, title: 'PAID',     sub: 'money in',           x: 1184, w: 216 },
];
const MEASURE = { n: 6, title: 'MEASURE', sub: 'what licenses a change' };

const HUB_Y = 34;
const ROW_Y = [110, 186, 262, 338, 414];
const NODE_H = 66;
const MEASURE_Y = 520;

export default function MapView({ nodes, summary }) {
  const [openId, setOpenId] = useState(null);
  const open = nodes.find(n => n.id === openId) || null;

  const byPhase = (p) => nodes.filter(n => n.phase === p);

  function NodeBox({ node }) {
    const ph = PHASES.find(p => p.n === node.phase);
    const isMeasure = node.phase === 6;
    const x = (isMeasure ? PHASES[Math.min(node.row + 1, 4)].x : ph.x) + 26;
    const w = (isMeasure ? PHASES[Math.min(node.row + 1, 4)].w : ph.w) - 26;
    const y = isMeasure ? MEASURE_Y : ROW_Y[node.row];
    const v = VERDICT[node.verdict] || VERDICT.bet;
    const active = openId === node.id;

    return (
      <g
        onClick={() => setOpenId(active ? null : node.id)}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label={`${node.title}, ${v.label}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(active ? null : node.id); } }}
      >
        {node.verdict !== 'none' && <rect x={x + 4} y={y + 4} width={w} height={NODE_H} fill="var(--ink)" />}
        <rect
          x={x} y={y} width={w} height={NODE_H}
          fill={v.fill === 'none' ? 'var(--paper)' : v.fill}
          stroke={active ? 'var(--ink)' : v.line}
          strokeWidth={active ? 4 : 2.5}
          strokeDasharray={node.verdict === 'none' ? '9 7' : undefined}
        />
        <text x={x + 12} y={y + 24} fontFamily="var(--font-display)" fontSize="21" fill={node.verdict === 'none' ? 'var(--ink3)' : 'var(--ink)'}>
          {node.title}
        </text>
        {node.stat != null && (
          <text x={x + w - 12} y={y + 25} textAnchor="end" fontFamily="var(--font-display)" fontSize="24" fill={v.line}>
            {node.stat}
          </text>
        )}
        <text x={x + 12} y={y + 42} fontFamily="var(--font-body)" fontSize="13" fill="var(--ink2)">{node.sub}</text>
        <text x={x + 12} y={y + NODE_H - 8} fontFamily="var(--font-mono)" fontSize="8.5" letterSpacing=".12em" fill={v.line}>
          {v.label}
        </text>
        <text x={x + w - 12} y={y + NODE_H - 8} textAnchor="end" fontFamily="var(--font-mono)" fontSize="8.5" fill="var(--ink3)">
          {active ? 'CLOSE' : 'OPEN +'}
        </text>
      </g>
    );
  }

  const ERA_TABS = [
    { key: 'current', href: '/admin/map', label: 'CURRENT TEST · WHATSAPP RECEPTIONIST', note: `since ${summary.pivot2}` },
    { key: 'marketing', href: '/admin/map?era=marketing', label: 'ARCHIVE · MARKETING AGENCIES', note: `${summary.pivot} to ${summary.pivot2}` },
    { key: 'recruiting', href: '/admin/map?era=recruiting', label: 'ARCHIVE · RECRUITING/STAFFING', note: `retired ${summary.pivot}` },
    { key: 'all', href: '/admin/map?era=all', label: 'ALL TIME · BLENDED', note: 'every era combined' },
  ];

  return (
    <div>
      {/* ---------- era switcher ---------- */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 0, marginBottom: 20,
        border: '2.5px solid var(--ink)', background: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)',
      }}>
        {ERA_TABS.map((t, i) => {
          const active = summary.era === t.key;
          return (
            <a key={t.key} href={t.href} style={{
              flex: '1 1 200px', padding: '10px 14px', textDecoration: 'none',
              borderRight: i < ERA_TABS.length - 1 ? '2px solid rgba(26,18,5,.14)' : 'none',
              background: active ? 'var(--ink)' : 'transparent',
            }}>
              <div className="mono" style={{
                fontSize: 10, letterSpacing: '.13em',
                color: active ? 'var(--amber)' : 'var(--ink3)',
              }}>{active ? '▸ ' : ''}{t.label}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: active ? 'var(--paper2)' : 'var(--ink3)' }}>{t.note}</div>
            </a>
          );
        })}
      </div>
      {summary.era !== 'current' && (
        <div style={{
          border: '2.5px solid var(--brick)', background: 'var(--brick-fill, var(--paper2))',
          padding: '8px 14px', marginBottom: 20,
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink2)',
        }}>
          {summary.era === 'recruiting'
            ? 'Viewing the retired recruiting/staffing era. These numbers are history, not the live test. Nothing here should drive a decision about the current ICP.'
            : summary.era === 'marketing'
            ? 'Viewing the retired marketing/digital agencies era. These numbers are history, not the live test. Nothing here should drive a decision about the current ICP.'
            : 'Viewing every era blended together. Use the current-test view to judge the live ICP on its own numbers.'}
        </div>
      )}

      {/* ---------- headline ---------- */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(146px, 1fr))',
        border: '2.5px solid var(--ink)', background: 'var(--paper)', boxShadow: '4px 4px 0 var(--ink)', marginBottom: 20,
      }}>
        {[
          { k: 'Touches', v: summary.touches, n: `${summary.pTouched} DM · ${summary.eAttempted} email` },
          { k: 'Real replies', v: summary.replies, n: `benchmark says ~${summary.expectedReplies}` },
          { k: 'Auto-replies', v: summary.autoReplies, n: 'delivery proof only' },
          { k: 'Bounce', v: `${summary.bounceRate}%`, n: 'avg is 7%' },
          { k: 'Free builds', v: 0, n: 'never run' },
          { k: 'Received', v: '$0', n: 'the only score' },
        ].map((s, i) => (
          <div key={s.k} style={{ padding: '10px 13px', borderRight: i < 5 ? '2px solid rgba(26,18,5,.14)' : 'none' }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{s.k}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 31, lineHeight: 1.05, color: (s.v === 0 || s.v === '$0') ? 'var(--brick)' : 'var(--ink)' }}>{s.v}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--ink3)' }}>{s.n}</div>
          </div>
        ))}
      </div>

      {/* ---------- the lock rule ---------- */}
      <div style={{ border: '2.5px solid var(--ink)', background: 'var(--paper2)', padding: '12px 16px', marginBottom: 20, boxShadow: '4px 4px 0 var(--ink)' }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--ink3)' }}>WHAT IS ALLOWED TO BE LOCKED</div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink2)', marginTop: 4 }}>
          A <b>system</b> locks when it runs correctly, because running is the whole job. A <b>strategy</b> never locks on
          taste, only by beating an outside benchmark. So the offer, the price, the ICP and the voice stay unlocked here
          no matter how settled they feel. Green boxes are machinery and rules. Amber and red are bets, judged against
          the market. <b>Click any box to open it.</b>
        </p>
      </div>

      {/* ---------- map ---------- */}
      <div style={{ border: '2.5px solid var(--ink)', background: 'var(--paper)', boxShadow: '5px 5px 0 var(--ink)', overflowX: 'auto' }}>
        <svg viewBox="0 0 1420 640" style={{ display: 'block', width: '100%', minWidth: 1040, height: 'auto' }}>
          <defs>
            <marker id="mk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
            </marker>
          </defs>

          {/* phase spine */}
          {PHASES.slice(0, -1).map((p, i) => (
            <path key={p.n} d={`M${p.x + p.w + 4},${HUB_Y + 28} L${PHASES[i + 1].x - 6},${HUB_Y + 28}`}
                  stroke="var(--ink)" strokeWidth="3" markerEnd="url(#mk)" fill="none" />
          ))}

          {PHASES.map(p => {
            const rows = byPhase(p.n);
            const lastY = ROW_Y[Math.max(...rows.map(r => r.row), 0)] + NODE_H;
            return (
              <g key={p.n}>
                <rect x={p.x + 4} y={HUB_Y + 4} width={p.w} height="56" fill="var(--ink)" />
                <rect x={p.x} y={HUB_Y} width={p.w} height="56" fill="var(--ink)" />
                <text x={p.x + 12} y={HUB_Y + 22} fontFamily="var(--font-mono)" fontSize="9.5" letterSpacing=".16em" fill="var(--amber)">PHASE {p.n}</text>
                <text x={p.x + 12} y={HUB_Y + 46} fontFamily="var(--font-display)" fontSize="26" fill="var(--paper)">{p.title}</text>
                <text x={p.x + p.w - 12} y={HUB_Y + 46} textAnchor="end" fontFamily="var(--font-body)" fontSize="12" fill="var(--paper2)">{p.sub}</text>
                <path d={`M${p.x + 14},${HUB_Y + 60} L${p.x + 14},${lastY - 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
                {rows.map(r => (
                  <path key={r.id} d={`M${p.x + 14},${ROW_Y[r.row] + 33} L${p.x + 26},${ROW_Y[r.row] + 33}`} stroke="var(--ink)" strokeWidth="2.5" fill="none" />
                ))}
              </g>
            );
          })}

          {nodes.filter(n => n.phase !== 6).map(n => <NodeBox key={n.id} node={n} />)}

          {/* measure band */}
          <line x1="20" y1="502" x2="1400" y2="502" stroke="var(--ink)" strokeWidth="2.5" />
          <rect x={PHASES[0].x + 4} y={MEASURE_Y + 4} width={PHASES[0].w} height="56" fill="var(--ink)" />
          <rect x={PHASES[0].x} y={MEASURE_Y} width={PHASES[0].w} height="56" fill="var(--ink)" />
          <text x={PHASES[0].x + 12} y={MEASURE_Y + 22} fontFamily="var(--font-mono)" fontSize="9.5" letterSpacing=".16em" fill="var(--amber)">PHASE {MEASURE.n}</text>
          <text x={PHASES[0].x + 12} y={MEASURE_Y + 46} fontFamily="var(--font-display)" fontSize="26" fill="var(--paper)">{MEASURE.title}</text>
          {nodes.filter(n => n.phase === 6).map(n => <NodeBox key={n.id} node={n} />)}

          <text x="710" y="618" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing=".12em" fill="var(--ink3)">
            GREEN = A SYSTEM OR A RULE · AMBER = AN UNPROVEN BET · RED = MEASURABLY BELOW BENCHMARK · DASHED = NEVER RUN
          </text>
        </svg>
      </div>

      {/* ---------- drill-down ---------- */}
      {open && (
        <div style={{
          border: '3px solid var(--ink)', background: 'var(--paper)', marginTop: 22,
          boxShadow: '6px 6px 0 var(--ink)',
        }}>
          <div style={{
            background: VERDICT[open.verdict]?.line || 'var(--ink)', padding: '12px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.16em', color: 'var(--paper)' }}>
                PHASE {open.phase} · {VERDICT[open.verdict]?.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--paper)', lineHeight: 1.1 }}>{open.title}</div>
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="mono"
              style={{
                fontSize: 11, letterSpacing: '.1em', padding: '8px 14px', cursor: 'pointer',
                border: '2px solid var(--paper)', background: 'transparent', color: 'var(--paper)',
              }}
            >CLOSE</button>
          </div>

          <div style={{ padding: '18px 20px', display: 'grid', gap: 18, gridTemplateColumns: 'minmax(280px, 1.4fr) minmax(220px, 1fr)' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 25, color: 'var(--ink)', lineHeight: 1.2 }}>
                {open.detail.headline}
              </p>
              <div style={{ borderLeft: `4px solid ${VERDICT[open.verdict]?.line}`, paddingLeft: 12, margin: '12px 0 14px' }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em', color: 'var(--ink3)' }}>WHY IT IS MARKED THIS WAY</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink2)' }}>{open.why}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink2)', marginTop: 4 }}>{open.detail.bench}</div>
              </div>
              <ul style={{ paddingLeft: 18, display: 'grid', gap: 7 }}>
                {open.detail.bullets.map((b, i) => (
                  <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, color: 'var(--ink2)' }}>{b}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '.14em', color: 'var(--ink3)', marginBottom: 6 }}>THE NUMBERS BEHIND IT</div>
              <div style={{ border: '2px solid var(--ink)', maxHeight: 300, overflowY: 'auto' }}>
                {open.detail.rows.length === 0 && (
                  <div style={{ padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink3)' }}>Nothing recorded yet.</div>
                )}
                {open.detail.rows.map(([k, v], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 12px',
                    borderTop: i ? '1px solid rgba(26,18,5,.12)' : 'none',
                    background: i % 2 ? 'var(--paper2)' : 'transparent',
                  }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink2)' }}>{k}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <p className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: 'var(--ink3)', marginTop: 18 }}>
          CLICK ANY BOX TO DRILL IN · READ LIVE FROM SUPABASE ON EVERY LOAD · BENCHMARKS RESEARCHED 2026-08-15
        </p>
      )}
    </div>
  );
}
