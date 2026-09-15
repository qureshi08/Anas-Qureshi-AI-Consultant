'use client';

import { useState } from 'react';

// Mirrors .claude/skills/cold-dm/SKILL.md. Update both together when the
// method changes, this page is a reference view of that file, not a second
// source of truth.

const OUTCOME = {
  close: { label: 'CLOSED — paid client', fill: 'var(--forest-fill)', line: 'var(--forest)' },
  nurture: { label: 'PARKED — follow up later', fill: 'var(--amber-fill)', line: 'var(--amber)' },
  referred: { label: 'REFERRED — new warm lead', fill: 'var(--amber-fill)', line: 'var(--amber)' },
  dead: { label: 'NO CLOSE — move on', fill: 'var(--paper3)', line: 'var(--ink3)' },
};

const LADDER = {
  id: 'ladder',
  label: 'Escalation ladder before you disengage',
  detail: 'Try each rung in order. Only stop after all three are declined.\n\n1. Book the demo / live number, the default ask.\n2. If declined: "no worries if now\'s not the time, okay if I check back in a couple months?"\n3. If declined too: "totally fair. Who do you know who\'d actually want something like this?"',
  children: [
    { edge: 'They say yes to a later check-in', node: { id: 'ladder-park', label: 'Parked for a later touch', outcome: 'nurture', detail: 'Add to the nurture list, re-touch in a few months, not a dead lead.' } },
    { edge: 'They give a referral', node: { id: 'ladder-ref', label: 'New warm lead from the referral', outcome: 'referred', detail: 'Treat the referral as a warm-outreach touch (ACA frame), not cold.' } },
    { edge: 'All three rungs declined', node: { id: 'ladder-dead', label: 'End of the road for this business', outcome: 'dead', detail: 'No close. Move to the next prospect, nothing more to try here.' } },
  ],
};

const OBJECTION = {
  id: 'objection',
  label: 'Objection handling',
  detail: '1. Agree first, never argue: "fair, I get that."\n2. Ask what\'s behind it: "what\'s making it feel steep, the setup or the monthly?"\n3. Isolate: "if that\'s sorted, is there anything else holding you back?"\n4. Real budget objection: never discount, point back at the guarantee and the value stack.\n5. Lukewarm not hostile: "1 to 10, where are you? What would move it up one?"',
  children: [
    { edge: 'Objection resolved', node: null }, // wired to BANT below at render time
    { edge: 'Still hesitant', node: LADDER },
  ],
};

const BANT = {
  id: 'bant',
  label: 'Qualify before pushing further (BANT)',
  detail: 'Budget: can they actually pay, or is it allocated elsewhere?\nAuthority: are they the owner/decision-maker?\nNeed: what specifically, in their own words, confirmed against what the receptionist actually does?\nTimeline: now, or someday?\n\nBuying objections (after real interest) are not the same as real objections, read which one you\'re in before holding the price line.',
  children: [
    { edge: 'Qualify — all aligned', node: {
      id: 'close-step', label: 'Assumptive close', detail: 'Never "want to see the demo?" Give a real choice: "want the live number now, or should I send you a slot tomorrow to see it live?"',
      children: [
        { edge: 'They book / try the demo and like it', node: { id: 'closed', label: 'Terms confirmed in writing, guarantee period starts', outcome: 'close', detail: '8 of 10 real inquiries correctly handled in 14 days or they pay nothing. Log the close, start the 14-day clock.' } },
        { edge: 'Still hesitant after the demo', node: OBJECTION },
      ],
    } },
    { edge: 'Disqualify — no budget or no real need', node: { id: 'disq', label: 'Let them go', outcome: 'dead', detail: 'Genuinely no fit. Don\'t keep spending touches here.' } },
    { edge: 'Educate — fits but needs more understanding', node: { id: 'educate', label: 'One more clarifying insight, then re-check', detail: 'Send one honest insight that reframes the offer, then loop back to see if they\'re ready to qualify.', children: [{ edge: 'Now aligned', node: null }, { edge: 'Still unclear', node: LADDER }] } },
    { edge: 'Realign — expectation doesn\'t match reality', node: { id: 'realign', label: 'Reset the expectation honestly', detail: 'Don\'t force a mismatched sale. Say plainly what this is and isn\'t, then re-check fit.', children: [{ edge: 'Now aligned', node: null }, { edge: 'Still mismatched', node: LADDER }] } },
  ],
};
// wire the "resolved" loops back into BANT now that BANT exists
OBJECTION.children[0].node = BANT;
BANT.children[2].node.children[0].node = BANT;
BANT.children[3].node.children[0].node = BANT;

const MESSAGE_2 = {
  id: 'msg2',
  label: 'Message 2 — the offer',
  detail: 'Money framing tied to what they just told you, then the offer in one line, then the guarantee if there\'s room, then a tiny CTA. Never the full price stack yet. Never a flat statement to end on, always a question.',
  children: [
    { edge: 'Straight yes', node: BANT },
    { edge: 'Objection raised', node: OBJECTION },
    { edge: 'Silence', node: LADDER },
  ],
};

const NO_PROBLEM = {
  id: 'noproblem',
  label: 'They say there\'s no problem',
  detail: '"We always answer fast." One graceful line, no pitch, but don\'t just vanish, try the ladder before disengaging.',
  children: [{ edge: 'Try to keep the door open', node: LADDER }],
};

const REPLY = {
  id: 'reply',
  label: 'They replied — is the problem real?',
  detail: 'Read their answer. A vague "yeah kind of" is not confirmation, ask one more specific question (what made you think of this now, what would it need to look like) before deciding which branch you\'re in.',
  children: [
    { edge: 'No real problem', node: NO_PROBLEM },
    { edge: 'Confirms the pain, in their own words', node: MESSAGE_2 },
  ],
};

const NO_REPLY = {
  id: 'noreply',
  label: 'No reply to message 1',
  detail: 'One follow-up nudge on the same question, still no pitch, a day or two later. That\'s it, don\'t chase further on this channel.',
  children: [
    { edge: 'Still nothing', node: { id: 'silent-dead', label: 'No close this round', outcome: 'dead', detail: 'Not necessarily gone for good, a fresh angle or a different channel later is fine. Don\'t re-send the same message.' } },
    { edge: 'They reply to the nudge', node: REPLY },
  ],
};

const MESSAGE_1 = {
  id: 'msg1',
  label: 'Message 1 sent — did they reply?',
  detail: 'Whatever the channel, message 1 is the observed-loss question only. Nothing about the receptionist, the guarantee, or a demo.',
  children: [
    { edge: 'No reply', node: NO_REPLY },
    { edge: 'They reply', node: REPLY },
  ],
};

const CHANNELS = [
  {
    id: 'warm', label: 'Warm', sub: 'personal network',
    detail: 'ACA frame: acknowledge the real relationship, compliment something real, ask. "Who do you know running a clinic, salon, property office, or restaurant who\'s mentioned losing a customer to a slow reply?" Referral ask, not a direct pitch, unless they own a fitting business themselves.',
  },
  {
    id: 'wa', label: 'WhatsApp cold', sub: 'Gulf / Pakistan SMB',
    detail: '"Salam! Came across [business] [real detail]. Quick one, when [their real scenario], [what happens]?" ≤300 chars, one context sentence plus the question, nothing else.',
  },
  {
    id: 'dm', label: 'LinkedIn DM', sub: 'connection + first message',
    detail: 'Connection note ≤280 chars, personalization only, no offer. First message ≤500 chars, same question-only discipline as WhatsApp.',
  },
  {
    id: 'email', label: 'Cold email', sub: 'paused for this ICP, check goal.md', paused: true,
    detail: 'Subject ≤60 chars, plain, never a pitch. Opening line is the observed fact as a question, old-friend-casual. The email itself is message 1, follow-ups (day 3, day 7) are where the escalation ladder actually lives.',
  },
];

function Chip({ text }) {
  return (
    <div className="mono" style={{
      fontSize: 10.5, letterSpacing: '.04em', color: 'var(--ink3)', margin: '10px 0 4px 2px',
    }}>
      ↳ {text}
    </div>
  );
}

function NodeBox({ node, depth }) {
  const [open, setOpen] = useState(depth < 1);
  if (!node) return null;
  const outcome = node.outcome ? OUTCOME[node.outcome] : null;

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        className="card"
        style={{
          cursor: 'pointer', padding: '12px 16px',
          background: outcome ? outcome.fill : 'var(--paper)',
          borderColor: outcome ? outcome.line : 'var(--ink)',
          boxShadow: `3px 3px 0 ${outcome ? outcome.line : 'var(--ink)'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)' }}>{node.label}</span>
          <span className="mono" style={{ fontSize: 10, color: outcome ? outcome.line : 'var(--ink3)', whiteSpace: 'nowrap' }}>
            {outcome ? outcome.label : (open ? 'CLOSE −' : 'OPEN +')}
          </span>
        </div>
        {open && node.detail && (
          <p style={{ fontSize: 13.5, color: 'var(--ink2)', marginTop: 8, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
            {node.detail}
          </p>
        )}
      </div>

      {open && node.children && (
        <div style={{ marginLeft: 22, borderLeft: '2px dashed var(--paper3)', paddingLeft: 16, marginTop: 6 }}>
          {node.children.map((c, i) => (
            <div key={i}>
              <Chip text={c.edge} />
              <NodeBox node={c.node} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlaybookFlow() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        {Object.entries(OUTCOME).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: v.fill, border: `2px solid ${v.line}`, display: 'inline-block' }} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink3)' }}>{v.label}</span>
          </div>
        ))}
      </div>

      <div className="tag" style={{ marginBottom: 8 }}>Step 1 · pick the channel, message 1 only differs here</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 22 }}>
        {CHANNELS.map(ch => (
          <NodeBox key={ch.id} node={ch} depth={2} />
        ))}
      </div>

      <div className="tag" style={{ marginBottom: 8 }}>Step 2 · once message 1 is sent, the tree is identical on every channel</div>
      <NodeBox node={MESSAGE_1} depth={0} />
    </div>
  );
}
