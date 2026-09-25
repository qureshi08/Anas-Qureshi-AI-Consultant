'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Menu relocked 2026-09-25: remote job first, then founder pitches (tech companies only).
// Small-business outreach pages are hidden under Archive with all data kept.
const TABS = [
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/pitches', label: 'Founder videos' },
  { href: '/admin/jobs/startups', label: 'Startup pitches' },
  { href: '/admin/inbound', label: 'Inbound' },
  { href: '/admin/chats', label: 'AI chats' },
  { href: '/admin/calls', label: 'Call requests' },
  { href: '/admin/inboxes', label: 'Inboxes' },
  { href: '/admin/archive', label: 'Archive' },
];

// Archived tools light up the Archive tab while one of them is open.
const ARCHIVE_PATHS = ['/admin/archive', '/admin/overview', '/admin/outbound', '/admin/cold-email', '/admin/campaigns', '/admin/compose', '/admin/leads', '/admin/send', '/admin/validator', '/admin/whatsapp-cold', '/admin/playbook', '/admin/map'];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
      {TABS.map(tab => {
        const active = tab.href === '/admin/archive'
          ? ARCHIVE_PATHS.some(p => pathname.startsWith(p))
          : tab.href === '/admin/jobs'
            ? pathname.startsWith('/admin/jobs') && !pathname.startsWith('/admin/jobs/startups')
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="mono"
            style={{
              fontSize: 12,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              padding: '9px 16px',
              border: '2px solid var(--ink)',
              borderRadius: 8,
              color: active ? 'var(--paper)' : 'var(--ink)',
              background: active ? 'var(--brick)' : 'var(--paper)',
              boxShadow: active ? '3px 3px 0 var(--ink)' : 'none',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
