/**
 * Archive (2026-09-25). Small-business outreach is stopped: Gulf WhatsApp receptionist, cold
 * email to agencies and recruiters, Maps leads, cold DMs. Anas chose "hide, keep data": these
 * pages are out of the menu but still work, and every database row is kept.
 */
const TOOLS = [
  ['/admin/inbound', 'Inbound', 'Leads that came in through the site. Moved here 2026-10-11 when the menu became the three 60-day tracks.'],
  ['/admin/chats', 'AI chats', 'Conversations with the live assistant on the site.'],
  ['/admin/calls', 'Call requests', 'Calls booked through the site.'],
  ['/admin/pitches', 'Founder videos', 'The founder video pitch pipeline, dropped 2026-09-26.'],
  ['/admin/overview', 'Old overview', 'The small-business funnel dashboard (prospects, cold email, bookings).'],
  ['/admin/outbound', 'Cold DM', 'Hand-sourced LinkedIn and Reddit prospects (prospects table).'],
  ['/admin/cold-email', 'Cold email', 'OutboundOS campaigns, leads, sequences, send queue, validator.'],
  ['/admin/whatsapp-cold', 'WhatsApp cold', 'Gulf WhatsApp receptionist leads (whatsapp_cold_leads).'],
  ['/admin/playbook', 'Playbook', 'The old cold outreach flowchart.'],
  ['/admin/map', 'The map', 'Business map, Position to Paid, split by era.'],
];

export default function Archive() {
  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: '0 0 6px' }}>Archive</h2>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 16 }}>
        Out of the menu: small-business outreach (stopped 2026-09-25) and everything outside the three 60-day tracks (2026-10-11). Nothing was deleted. These tools still open and all their data is kept.
      </p>
      {TOOLS.map(([href, label, what]) => (
        <a key={href} href={href} style={{ display: 'block', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, color: 'var(--ink)', textDecoration: 'none', background: 'var(--paper)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{label} &rarr;</div>
          <div style={{ fontSize: 13, color: 'var(--ink3)' }}>{what}</div>
        </a>
      ))}
    </>
  );
}
