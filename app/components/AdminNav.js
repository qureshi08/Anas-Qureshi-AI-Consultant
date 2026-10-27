'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Menu relocked 2026-10-11 (Anas: "simple, we have Gulf jobs, startup jobs, and freelance is the
// third priority"). The three tracks of the 60-day lock in priority order, then Inboxes (the
// Gmail connection the one click send depends on, reconnect weekly) and Archive. Since
// 2026-10-27 the Gulf jobs tab opens the referrals-first plan page; the applications board
// (/admin/jobs) is one link from it. Founder videos,
// Inbound, AI chats and Call requests moved under Archive; pages and data are kept.
const TABS = [
  { href: '/admin/north-star', label: 'North Star' },
  { href: '/admin/jobs/plan', label: '1. Gulf jobs' },
  { href: '/admin/jobs/startups', label: '2. Startup roles' },
  { href: '/admin/freelance', label: '3. Freelance' },
  { href: '/admin/inboxes', label: 'Inboxes' },
  { href: '/admin/archive', label: 'Archive' },
];

// Archived tools light up the Archive tab while one of them is open.
const ARCHIVE_PATHS = ['/admin/archive', '/admin/pitches', '/admin/inbound', '/admin/chats', '/admin/calls', '/admin/overview', '/admin/outbound', '/admin/cold-email', '/admin/campaigns', '/admin/compose', '/admin/leads', '/admin/send', '/admin/validator', '/admin/whatsapp-cold', '/admin/playbook', '/admin/map'];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
      {TABS.map(tab => {
        const active = tab.href === '/admin/archive'
          ? ARCHIVE_PATHS.some(p => pathname.startsWith(p))
          : tab.href === '/admin/jobs/plan'
            ? pathname.startsWith('/admin/jobs') && !pathname.startsWith('/admin/jobs/startups')
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="mono"
            style={{
              fontSize: 12,
              textTransform: 'lowercase',
              textDecoration: 'none',
              padding: '8px 15px',
              border: 'none',
              borderRadius: 999,
              color: active ? '#FFFEFA' : 'var(--ink)',
              background: active ? 'var(--ink)' : 'var(--paper)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
