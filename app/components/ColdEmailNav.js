'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The cold email workspace, same seven sections as the original OutboundOS.
const TABS = [
  { href: '/admin/cold-email', label: 'Dashboard' },
  { href: '/admin/campaigns', label: 'Campaigns' },
  { href: '/admin/compose', label: 'Compose' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/send', label: 'Send queue' },
  { href: '/admin/validator', label: 'Validator' },
  { href: '/admin/inboxes', label: 'Inboxes' },
];

export default function ColdEmailNav() {
  const pathname = usePathname();
  return (
    <div style={{ borderBottom: '1.5px dashed rgba(26,18,5,0.2)', paddingBottom: 14, marginBottom: 20 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>
        Cold email workspace
      </div>
      <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const active = tab.href === '/admin/campaigns'
            ? pathname.startsWith('/admin/campaigns')
            : pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                border: `1.5px solid ${active ? 'var(--ink)' : 'transparent'}`,
                color: active ? 'var(--ink)' : 'var(--ink3)',
                background: active ? 'var(--paper2)' : 'transparent',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
