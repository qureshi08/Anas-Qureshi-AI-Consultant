// Era switcher shared by the admin pages. Server-component friendly: plain
// links, no client state. `basePath` is the page path; `extraQuery` carries any
// other query params the page needs to preserve (e.g. "status=replied").
import { PIVOT } from '../../lib/era';

const TABS = [
  { key: 'current', label: 'CURRENT · MARKETING AGENCIES', note: `since ${PIVOT}` },
  { key: 'recruiting', label: 'ARCHIVE · RECRUITING', note: `retired ${PIVOT}` },
  { key: 'all', label: 'ALL TIME', note: 'blended' },
];

export default function EraTabs({ era, basePath, extraQuery = '' }) {
  const href = (key) => {
    const parts = [];
    if (key !== 'current') parts.push(`era=${key}`);
    if (extraQuery) parts.push(extraQuery);
    return parts.length ? `${basePath}?${parts.join('&')}` : basePath;
  };

  return (
    <>
      <div style={{
        display: 'flex', flexWrap: 'wrap', marginBottom: 16,
        border: '2px solid var(--ink)', borderRadius: 6, overflow: 'hidden', background: 'var(--paper)',
      }}>
        {TABS.map((t, i) => {
          const active = era === t.key;
          return (
            <a key={t.key} href={href(t.key)} style={{
              flex: '1 1 160px', padding: '8px 12px', textDecoration: 'none',
              borderRight: i < TABS.length - 1 ? '1.5px solid rgba(26,18,5,.18)' : 'none',
              background: active ? 'var(--ink)' : 'transparent',
            }}>
              <div className="mono" style={{
                fontSize: 9.5, letterSpacing: '.11em',
                color: active ? 'var(--amber)' : 'var(--ink3)',
              }}>{active ? '▸ ' : ''}{t.label}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: active ? 'var(--paper2)' : 'var(--ink3)' }}>{t.note}</div>
            </a>
          );
        })}
      </div>
      {era !== 'current' && (
        <div style={{
          border: '2px solid var(--brick)', borderRadius: 6, padding: '8px 12px', marginBottom: 16,
          fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--ink2)', background: 'var(--paper2)',
        }}>
          {era === 'recruiting'
            ? 'Viewing the retired recruiting/staffing era. History, not the live test. Nothing here should drive a decision about the current ICP.'
            : 'Viewing every era blended. Use the current view to judge the live test on its own numbers.'}
        </div>
      )}
    </>
  );
}
