'use client';

import { useState, useEffect, useMemo } from 'react';

/**
 * The PWOC email builder, ported from OutboundOS.
 *
 * The whole point: you don't write an email into one blank box. You write it in
 * four named moves — Personalization, Who am I, Offer, CTA — each with its own
 * rules, and the score panel tells you which rules you're currently breaking.
 */

const SECTIONS = [
  {
    key: 'p',
    tag: 'P — PERSONALIZATION',
    color: 'var(--brick)',
    hint: '1-2 sentences. Cold read. Cannot signal selling.',
    placeholder: 'Hey {{first_name}}, [cold read observation that makes them think you know them]...',
    tips: ['Would a real friend send this?', 'No corporate language', 'Voluntary disclosure of something about you'],
    rows: 3,
  },
  {
    key: 'w',
    tag: 'W — WHO AM I',
    color: 'var(--amber)',
    hint: 'Social proof + in-group signal. 1-2 sentences.',
    placeholder: 'I [do what] for [their industry type]. Currently working with [similar company], [specific result] in [timeframe].',
    tips: ['Specific numbers only', 'Match their reference group', 'Borrow credibility from clients'],
    rows: 3,
  },
  {
    key: 'o',
    tag: 'O — OFFER',
    color: 'var(--forest)',
    hint: 'Observation + "I will do X in Y days or Z risk mitigation".',
    placeholder: "[Observation about their situation].\n\nI'll [specific deliverable] in [specific timeframe]. If I don't [result], you don't pay a cent.",
    tips: ['Quantified, no ranges', 'Time-bound', 'Risk on YOU, not them', 'Minimise friction'],
    rows: 5,
  },
  {
    key: 'c',
    tag: 'C — CTA',
    color: 'var(--ink)',
    hint: 'ONE specific ask + specific time. Max 2 steps to booked.',
    placeholder: "Open to a 15-min call? Can ring you at [time] today or [time] tomorrow, or I'll send a one-click Meet link. Just let me know.",
    tips: ['Specific time offered', 'No "let me know your thoughts"', 'Yes leads to booked in 2 steps'],
    rows: 3,
  },
];

// The seven checks from your rules list. Score 5+ before sending.
function scoreEmail({ subject, p, w, o, c, signoff }) {
  const body = [p, w, o, c].join('\n');
  const lower = body.toLowerCase();
  const checks = [
    {
      label: 'Subject under 50 characters',
      pass: subject.length > 0 && subject.length <= 50,
    },
    {
      label: 'No links (they kill cold deliverability)',
      pass: !/https?:\/\/|www\./i.test(body),
    },
    {
      label: 'Written as "I", never "we"',
      pass: !/\bwe\b|\bour\b|\bus\b/i.test(body),
    },
    {
      label: 'No "hope this finds you well" or similar filler',
      pass: !/hope (this|you)|hope all is well|trust you are well|reaching out to/i.test(lower),
    },
    {
      label: 'No "would you be interested"',
      pass: !/would you be interested|are you interested|any interest/i.test(lower),
    },
    {
      label: 'CTA names a specific time',
      pass: /\d\s*(am|pm)|\bmonday|tuesday|wednesday|thursday|friday|today|tomorrow|this week|next week/i.test(c),
    },
    {
      label: 'Offer contains a real number',
      pass: /\d/.test(o),
    },
  ];
  const passed = checks.filter(x => x.pass).length;
  return { checks, passed, total: checks.length };
}

function renderPreview(template, lead) {
  if (!lead) return template;
  const vars = {
    first_name: lead.first_name || 'there',
    last_name: lead.last_name || '',
    company: lead.company || '',
    title: lead.title || '',
    industry: lead.industry || '',
    city: 'your area',
    email: lead.email || '',
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) =>
    vars[k] !== undefined && vars[k] !== '' ? vars[k] : m);
}

export default function ComposeBuilder({ campaigns, initialCampaignId, steps, sampleLead, saveAction }) {
  const [campaignId, setCampaignId] = useState(initialCampaignId || '');
  const [stepIndex, setStepIndex] = useState(0);
  const [allSteps, setAllSteps] = useState(() => normalise(steps));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  function normalise(raw) {
    const list = (raw && raw.length ? raw : []).map(s => ({
      subject: s.subject_template || '',
      p: s.part_p || '', w: s.part_w || '', o: s.part_o || '', c: s.part_c || '',
      signoff: s.part_signoff || '',
      body: s.body_template || '',
      delay: s.delay_days || 3,
    }));
    if (!list.length) list.push({ subject: '', p: '', w: '', o: '', c: '', signoff: '', body: '', delay: 0 });
    return list;
  }

  useEffect(() => { setAllSteps(normalise(steps)); setStepIndex(0); }, [steps, initialCampaignId]);

  const step = allSteps[stepIndex] || { subject: '', p: '', w: '', o: '', c: '', signoff: '', delay: 3 };

  function update(field, value) {
    setAllSteps(prev => prev.map((s, i) => (i === stepIndex ? { ...s, [field]: value } : s)));
    setSavedMsg('');
  }

  const composedBody = useMemo(
    () => [step.p, step.w, step.o, step.c, step.signoff].filter(Boolean).join('\n\n'),
    [step],
  );

  const score = useMemo(() => scoreEmail(step), [step]);

  async function handleSave() {
    if (!campaignId) return;
    setSaving(true);
    const fd = new FormData();
    fd.set('campaign_id', campaignId);
    allSteps.forEach(s => {
      const body = [s.p, s.w, s.o, s.c, s.signoff].filter(Boolean).join('\n\n');
      fd.append('subject', s.subject);
      fd.append('body', body);
      fd.append('delay', String(s.delay || 3));
      fd.append('part_p', s.p);
      fd.append('part_w', s.w);
      fd.append('part_o', s.o);
      fd.append('part_c', s.c);
      fd.append('part_signoff', s.signoff);
    });
    await saveAction(fd);
    setSaving(false);
    setSavedMsg('Saved.');
  }

  const labelStyle = { fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <select
          value={campaignId}
          onChange={e => { window.location.href = `/admin/compose?campaign=${e.target.value}`; }}
          style={{ flex: '1 1 260px' }}
        >
          <option value="">Select a campaign to write for</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {campaignId && (
          <>
            <button className="btn" onClick={handleSave} disabled={saving} style={{ fontSize: 16 }}>
              {saving ? 'Saving…' : 'Save to campaign'}
            </button>
            {savedMsg && <span className="mono" style={{ fontSize: 11, color: 'var(--forest)' }}>{savedMsg}</span>}
          </>
        )}
      </div>

      {!campaignId && (
        <p style={{ color: 'var(--ink3)' }}>Pick a campaign above, then write its email here.</p>
      )}

      {campaignId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {/* ── BUILDER ── */}
          <div>
            {/* Step tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {allSteps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStepIndex(i)}
                  className="mono"
                  style={{
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: '2px solid var(--ink)',
                    background: i === stepIndex ? 'var(--ink)' : 'transparent',
                    color: i === stepIndex ? 'var(--paper)' : 'var(--ink)',
                  }}
                >
                  {i === 0 ? 'Step 1 · first touch' : `Step ${i + 1} · +${s.delay}d`}
                </button>
              ))}
              {allSteps.length < 4 && (
                <button
                  onClick={() => { setAllSteps(p => [...p, { subject: '', p: '', w: '', o: '', c: '', signoff: '', delay: 3 }]); setStepIndex(allSteps.length); }}
                  className="mono"
                  style={{
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: '2px dashed var(--ink3)', background: 'transparent', color: 'var(--ink3)',
                  }}
                >
                  + Follow-up
                </button>
              )}
            </div>

            {/* Subject */}
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className="mono" style={{ ...labelStyle, color: 'var(--brick)' }}>Subject</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                  Keep under 50. Curiosity-driven. No spammy words.
                </span>
              </div>
              <input
                value={step.subject}
                onChange={e => update('subject', e.target.value)}
                placeholder={stepIndex === 0 ? 'e.g. Quick question, {{first_name}}' : 'Leave blank to reply on the same thread'}
                style={{ marginTop: 8 }}
              />
              <div className="mono" style={{ fontSize: 10, marginTop: 4, color: step.subject.length > 50 ? 'var(--brick)' : 'var(--ink3)' }}>
                {step.subject.length} / 50
              </div>
            </div>

            {/* PWOC sections */}
            {SECTIONS.map(sec => (
              <div className="card" key={sec.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span className="mono" style={{ ...labelStyle, color: sec.color, fontWeight: 700 }}>{sec.tag}</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{sec.hint}</span>
                </div>
                <textarea
                  value={step[sec.key]}
                  onChange={e => update(sec.key, e.target.value)}
                  placeholder={sec.placeholder}
                  rows={sec.rows}
                  style={{ marginTop: 8, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  {sec.tips.map(t => (
                    <span key={t} className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>✓ {t}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Sign-off + delay */}
            <div className="card" style={{ marginBottom: 12 }}>
              <span className="mono" style={{ ...labelStyle, color: 'var(--ink3)' }}>Sign-off</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginLeft: 10 }}>
                Casual. First name only.
              </span>
              <input value={step.signoff} onChange={e => update('signoff', e.target.value)} placeholder="Thanks, Anas" style={{ marginTop: 8 }} />

              {stepIndex > 0 && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ ...labelStyle, color: 'var(--ink3)' }}>Wait</span>
                  <input
                    type="number" min="1" value={step.delay}
                    onChange={e => update('delay', Number(e.target.value))}
                    style={{ width: 80 }}
                  />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>days after the previous email</span>
                </div>
              )}
            </div>
          </div>

          {/* ── PREVIEW + SCORE ── */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono" style={{ ...labelStyle, color: 'var(--brick)' }}>Preview</span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink3)' }}>
                  {sampleLead ? `as ${sampleLead.email}` : 'no leads yet'}
                </span>
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--ink)', marginTop: 10, paddingBottom: 8, borderBottom: '1.5px dashed rgba(26,18,5,0.2)' }}>
                {renderPreview(step.subject, sampleLead) || <span style={{ color: 'var(--ink3)' }}>Subject appears here</span>}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink2)', marginTop: 10, lineHeight: 1.5 }}>
                {renderPreview(composedBody, sampleLead) || <span style={{ color: 'var(--ink3)' }}>Write the sections and this fills in.</span>}
              </div>
            </div>

            <div className="card" style={{ borderColor: score.passed >= 5 ? 'var(--forest)' : 'var(--amber)', boxShadow: `4px 4px 0 ${score.passed >= 5 ? 'var(--forest)' : 'var(--amber)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="mono" style={{ ...labelStyle, color: 'var(--ink)' }}>PWOC score</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: score.passed >= 5 ? 'var(--forest)' : 'var(--amber)' }}>
                  {score.passed}/{score.total}
                </span>
              </div>
              <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2, marginBottom: 10 }}>
                {score.passed >= 5 ? 'Good to send.' : 'Score 5+ before sending.'}
              </p>
              {score.checks.map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
                  <span style={{ color: c.pass ? 'var(--forest)' : 'var(--brick)', fontWeight: 'bold', fontSize: 13 }}>
                    {c.pass ? '✓' : '✗'}
                  </span>
                  <span style={{ fontSize: 13, color: c.pass ? 'var(--ink3)' : 'var(--ink2)' }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
