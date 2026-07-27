'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Three distinct lead lanes (locked 2026-07-28), never blended:
//   Cold DM   -> `prospects` table, sourced by hand on LinkedIn/Reddit
//   Cold email -> `campaigns` + `leads` tables, scraped via Google Maps, run through OutboundOS
//   Inbound   -> `inbound_leads` + `conversations`, from the site and the AI assistant
const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/calls', label: 'Call requests' },
  { href: '/admin/outbound', label: 'Cold DM' },
  { href: '/admin/campaigns', label: 'Cold email' },
  { href: '/admin/inboxes', label: 'Inboxes' },
  { href: '/admin/inbound', label: 'Inbound' },
  { href: '/admin/chats', label: 'AI chats' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
      {TABS.map(tab => {
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
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
