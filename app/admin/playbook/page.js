import PlaybookFlow from './PlaybookFlow';

export const dynamic = 'force-static';

export default function PlaybookPage() {
  return (
    <div>
      <div className="tag">Every path a cold touch can take</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', margin: '4px 0 6px' }}>
        The outreach flow.
      </h2>
      <p style={{ fontSize: 15, color: 'var(--ink2)', maxWidth: 680, marginBottom: 22 }}>
        Same tree for warm, WhatsApp cold, LinkedIn DM, and cold email, they only differ in how message 1 opens.
        Click any box to open what to actually say and where it can lead. Green ends in a paid client, amber
        ends in a lead worth keeping, grey ends in no close. Source of truth: <span className="mono" style={{ fontSize: 12 }}>.claude/skills/cold-dm/SKILL.md</span>.
      </p>
      <PlaybookFlow />
    </div>
  );
}
