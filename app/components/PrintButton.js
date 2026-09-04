'use client';

export default function PrintButton({ label = 'Print / Save as PDF' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ fontSize: 13, padding: '8px 16px', border: '2px solid #111', borderRadius: 8, background: '#111', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
    >
      {label}
    </button>
  );
}
