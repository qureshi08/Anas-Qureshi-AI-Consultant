'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/calls', label: 'Call requests' },
  { href: '/admin/outbound', label: 'Outbound' },
  { href: '/admin/inbound', label: 'Inbound' },
  { href: '/admin/chats', label: 'AI chats' },
  { href: '/admin/campaigns', label: 'Campaigns' },
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
