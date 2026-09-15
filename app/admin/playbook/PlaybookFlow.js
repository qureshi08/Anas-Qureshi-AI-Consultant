'use client';

import { useState } from 'react';

// A real flowchart, not an accordion. Mirrors .claude/skills/cold-dm/SKILL.md,
// update both together when the method changes.

const OUTCOME = {
  close: { label: 'CLOSED', fill: 'var(--forest-fill)', line: 'var(--forest)' },
  nurture: { label: 'PARKED', fill: 'var(--amber-fill)', line: 'var(--amber)' },
  referred: { label: 'REFERRED', fill: 'var(--amber-fill)', line: 'var(--amber)' },
  dead: { label: 'NO CLOSE', fill: 'var(--paper3)', line: 'var(--ink3)' },
};

const W = 210, H = 78;
const COL_X = [20, 270, 520, 770, 1020, 1270, 1520, 1770];
const ROW_Y = [70, 180, 290, 400, 510];
const GAP = COL_X[1] - COL_X[0] - W; // the empty strip between any two columns, always safe to route through
const GUTTER = ROW_Y[4] + H + 40; // below every row, always safe to route through
const box = (col, row) => ({ x: COL_X[col], y: ROW_Y[row], col, row });

const NODES = [
  { id: 'warm', ...box(0, 0), label: 'Warm', sub: 'personal network', detail: 'ACA frame: acknowledge the real relationship, compliment something real, ask. "Who do you know running a clinic, salon, property office, or restaurant who\'s mentioned losing a customer to a slow reply?" A referral ask, not a direct pitch, unless they own a fitting business themselves.' },
  { id: 'wa', ...box(0, 1), label: 'WhatsApp cold', sub: 'Gulf / Pakistan SMB', detail: '"Salam! Came across [business] [real detail]. Quick one, when [their real scenario], [what happens]?" ≤300 chars, one context sentence plus the question, nothing else.' },
  { id: 'dm', ...box(0, 2), label: 'LinkedIn DM', sub: 'connection + first msg', detail: 'Connection note ≤280 chars, personalization only, no offer. First message ≤500 chars, same question-only discipline as WhatsApp.' },
  { id: 'email', ...box(0, 3), label: 'Cold email', sub: 'paused, check goal.md', detail: 'Subject ≤60 chars, never a pitch. Opening line is the observed fact as a question, old-friend-casual. The email itself is message 1, follow-ups (day 3, day 7) are where the escalation ladder lives.' },

  { id: 'msg1', ...box(1, 1), label: 'Message 1 sent', sub: 'question only, every channel', detail: 'Zero mention of the receptionist, the guarantee, or a demo. It stands or falls on curiosity alone.' },
  { id: 'nudge', ...box(1, 3), label: 'No reply, one nudge', sub: 'same question, still no pitch', detail: 'A day or two later, one light nudge on the same question. Don\'t chase further on this channel after that.' },

  { id: 'probe', ...box(2, 0), label: 'Problem confirmed?', sub: 'push for a specific answer', detail: 'A vague "yeah kind of" is not confirmation. Ask one more specific question (what made you think of this now, what would it need to look like) before deciding which branch you\'re in.' },
  { id: 'deadSilent', ...box(2, 3), label: 'Still nothing', outcome: 'dead', detail: 'Not gone for good, a fresh angle or a different channel later is fine. Don\'t re-send the same message.' },

  { id: 'msg2', ...box(3, 0), label: 'Message 2: the offer', sub: 'money framing + offer + guarantee', detail: 'Money framing tied to what they told you, the offer in one line, the guarantee if there\'s room, one tiny CTA. Never the full price stack yet. Never end on a flat statement.' },
  { id: 'ladder', ...box(3, 2), label: 'Escalation ladder', sub: '3 rungs before you disengage', detail: '1. Book the demo, the default ask.\n2. Declined: ask permission to check back in a couple months.\n3. Declined too: "who do you know who\'d actually want this?"\nOnly stop after all three.' },

  { id: 'response', ...box(4, 0), label: 'Their response', sub: 'yes / objection / silence', detail: 'Read what actually came back before picking a branch.' },
  { id: 'objection', ...box(4, 1), label: 'Objection handling', sub: 'agree, ask why, isolate', detail: '1. Agree first: "fair, I get that."\n2. Ask what\'s behind it, don\'t restate the offer.\n3. Isolate: is this the only blocker?\n4. Real budget objection: never discount, point at the guarantee and the stack.\n5. Lukewarm: "1 to 10, what moves it up one?"' },
  { id: 'parked', ...box(4, 2), label: 'Parked', outcome: 'nurture', detail: 'Re-touch in a few months. Not a dead lead.' },
  { id: 'referred', ...box(4, 3), label: 'Referred', outcome: 'referred', detail: 'Treat as a warm-outreach touch (ACA frame), not cold.' },
  { id: 'noclose1', ...box(4, 4), label: 'No close', outcome: 'dead', detail: 'All three ladder rungs declined. Move on.' },

  { id: 'qualify', ...box(5, 0), label: 'Qualify (BANT)', sub: 'budget · authority · need · timeline', detail: 'Budget: can they actually pay? Authority: owner or decision-maker? Need: what specifically, in their words? Timeline: now or someday? Buying objections (after real interest) are not the same as real objections.' },
  { id: 'noclose2', ...box(5, 1), label: 'No close', outcome: 'dead', detail: 'Disqualified: genuinely no budget or no real need. Don\'t keep spending touches here.' },

  { id: 'closeStep', ...box(6, 0), label: 'Assumptive close', sub: 'live number now, or a slot tomorrow', detail: 'Never "want to see the demo?" Give a real choice between two options, force a pick instead of an open canvas.' },
  { id: 'closed', ...box(7, 0), label: 'Closed', outcome: 'close', detail: 'Terms confirmed in writing. 8 of 10 real inquiries correctly handled in 14 days or they pay nothing, the clock starts now.' },
];

const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));
const cx = (n) => n.x + W / 2;
const right = (n) => ({ x: n.x + W, y: n.y + H / 2 });
const left = (n) => ({ x: n.x, y: n.y + H / 2 });
const top = (n) => ({ x: n.x + W / 2, y: n.y });
const bottom = (n) => ({ x: n.x + W / 2, y: n.y + H });

const EDGES = [
  { from: 'warm', to: 'msg1' }, { from: 'wa', to: 'msg1' }, { from: 'dm', to: 'msg1' }, { from: 'email', to: 'msg1' },
  { from: 'msg1', to: 'probe', label: 'reply' },
  { from: 'msg1', to: 'nudge', label: 'no reply' },
  { from: 'nudge', to: 'deadSilent', label: 'still nothing' },
  { from: 'probe', to: 'msg2', label: 'confirms pain' },
  { from: 'probe', to: 'ladder', label: 'no problem' },
  { from: 'msg2', to: 'response' },
  { from: 'response', to: 'qualify', label: 'straight yes' },
  { from: 'response', to: 'objection', label: 'objection' },
  { from: 'response', to: 'ladder', label: 'silence', kind: 'back' },
  { from: 'objection', to: 'qualify', label: 'resolved' },
  { from: 'objection', to: 'ladder', label: 'not resolved', kind: 'back' },
  { from: 'ladder', to: 'parked' }, { from: 'ladder', to: 'referred' }, { from: 'ladder', to: 'noclose1' },
  { from: 'qualify', to: 'closeStep', label: 'qualify' },
  { from: 'qualify', to: 'noclose2', label: 'disqualify' },
  { from: 'qualify', to: 'qualify', label: 'educate / realign, re-check', kind: 'loop' },
  { from: 'closeStep', to: 'closed', label: 'booked' },
  { from: 'closeStep', to: 'objection', label: 'still hesitant', kind: 'back' },
];

// Back edges always target a node in a column to the left. Two safe cases:
// adjacent columns route straight through the empty strip between them;
// a multi-column jump drops into the gutter below every row (nothing lives
// there) and rises back up through the empty strip just past the target's
// own column, so the line never cuts through an unrelated box in between.
function edgePath(e) {
  const a = NODE_BY_ID[e.from], b = NODE_BY_ID[e.to];

  if (e.kind === 'loop') {
    const t = top(a);
    return `M ${t.x - 30},${t.y} C ${t.x - 30},${t.y - 46} ${t.x + W + 30},${t.y - 46} ${t.x + W + 30},${t.y} `;
  }

  if (e.kind === 'back') {
    const br = right(b); // always enter the target from its right edge
    if (a.col - b.col <= 1) {
      const al = left(a);
      const midX = a.x - GAP / 2;
      return `M ${al.x},${al.y} L ${midX},${al.y} L ${midX},${br.y} L ${br.x},${br.y}`;
    }
    const ab = bottom(a);
    const riseX = b.x + W + GAP / 2; // the empty strip just right of the target's own column
    return `M ${ab.x},${ab.y} L ${ab.x},${GUTTER} L ${riseX},${GUTTER} L ${riseX},${br.y} L ${br.x},${br.y}`;
  }

  const sameRow = a.y === b.y;
  const p1 = sameRow ? right(a) : (a.y < b.y ? bottom(a) : top(a));
  const p2 = sameRow ? left(b) : top(b);
  if (sameRow) {
    const midX = (p1.x + p2.x) / 2;
    return `M ${p1.x},${p1.y} L ${midX},${p1.y} L ${midX},${p2.y} L ${p2.x},${p2.y}`;
  }
  const midY = (p1.y + p2.y) / 2;
  return `M ${p1.x},${p1.y} L ${p1.x},${midY} L ${p2.x},${midY} L ${p2.x},${p2.y}`;
}

const CANVAS_W = COL_X[COL_X.length - 1] + W + 30;
const CANVAS_H = GUTTER + 30;

export default function PlaybookFlow() {
  const [openId, setOpenId] = useState('msg1');
  const open = NODE_BY_ID[openId] || null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(OUTCOME).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: v.fill, border: `2px solid ${v.line}`, display: 'inline-block' }} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{v.label}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', border: '2.5px solid var(--ink)', borderRadius: 12, boxShadow: '4px 4px 0 var(--ink)', background: 'var(--paper)' }}>
        <svg width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={{ display: 'block' }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ink3)" />
            </marker>
            <marker id="arrowBack" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--brick)" />
            </marker>
          </defs>

          {EDGES.map((e, i) => {
            const back = e.kind === 'back' || e.kind === 'loop';
            return (
              <g key={i}>
                <path d={edgePath(e)} fill="none" stroke={back ? 'var(--brick)' : 'var(--ink3)'}
                  strokeWidth="2" strokeDasharray={back ? '6 4' : undefined}
                  markerEnd={`url(#${back ? 'arrowBack' : 'arrow'})`} />
                {e.label && (() => {
                  const a = NODE_BY_ID[e.from], b = NODE_BY_ID[e.to];
                  const lx = e.kind === 'loop' ? cx(a) : (a.x + b.x) / 2 + W / 2;
                  const ly = e.kind === 'loop' ? a.y - 50 : Math.min(a.y, b.y) + H / 2 - 6;
                  return (
                    <text x={lx} y={ly} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5"
                      fill={back ? 'var(--brick)' : 'var(--ink3)'}>{e.label}</text>
                  );
                })()}
              </g>
            );
          })}

          {NODES.map(n => {
            const o = n.outcome ? OUTCOME[n.outcome] : null;
            const active = openId === n.id;
            return (
              <g key={n.id} onClick={() => setOpenId(n.id)} style={{ cursor: 'pointer' }}
                role="button" tabIndex={0} aria-label={n.label}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpenId(n.id); } }}>
                <rect x={n.x + 3} y={n.y + 3} width={W} height={H} fill="var(--ink)" opacity={active ? 0.35 : 0.18} />
                <rect x={n.x} y={n.y} width={W} height={H}
                  fill={o ? o.fill : 'var(--paper)'}
                  stroke={active ? 'var(--ink)' : (o ? o.line : 'var(--ink3)')}
                  strokeWidth={active ? 3 : 2} rx="8" />
                <text x={n.x + 12} y={n.y + 27} fontFamily="var(--font-display)" fontSize="16.5" fill="var(--ink)">{n.label}</text>
                {n.sub && <text x={n.x + 12} y={n.y + 46} fontFamily="var(--font-body)" fontSize="11.5" fill="var(--ink3)">{n.sub}</text>}
                {o && <text x={n.x + 12} y={n.y + H - 10} fontFamily="var(--font-mono)" fontSize="9" letterSpacing=".1em" fill={o.line}>{o.label}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {open && (
        <div className="card" style={{ marginTop: 16, padding: '16px 20px' }}>
          <div className="tag">{open.outcome ? OUTCOME[open.outcome].label : 'STEP'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', margin: '4px 0 8px' }}>{open.label}</div>
          <p style={{ fontSize: 14.5, color: 'var(--ink2)', whiteSpace: 'pre-line', lineHeight: 1.55 }}>{open.detail}</p>
        </div>
      )}
    </div>
  );
}
