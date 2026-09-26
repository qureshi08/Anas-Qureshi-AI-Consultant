'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { sendPitchReply } from './actions';

const field = { width: '100%', boxSizing: 'border-box', background: '#1c1c1c', color: '#f5f5f5', border: '1px solid #333', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontFamily: 'inherit' };

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ background: '#f5f5f5', color: '#111', padding: '12px 22px', borderRadius: 999, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15, opacity: pending ? .6 : 1 }}>
      {pending ? 'Sending…' : 'Send to Anas'}
    </button>
  );
}

/** Reply box on the pitch page: the message goes straight to Anas, no mail app needed. */
export default function ReplyBox({ slug, company }) {
  const [state, action] = useFormState(sendPitchReply, null);
  if (state?.ok) {
    return <p style={{ maxWidth: 440, textAlign: 'center', fontSize: 16, lineHeight: 1.55, margin: '4px 0 0' }}>Thanks, I got it. I&apos;ll reply to you by email shortly.</p>;
  }
  return (
    <form action={action} style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
      <input type="hidden" name="slug" value={slug} />
      <input name="email" type="email" required placeholder="Your email" autoComplete="email" style={field} />
      <textarea name="message" required rows={3} placeholder={`What would you like for ${company}?`} style={{ ...field, resize: 'vertical' }} />
      <div style={{ display: 'flex', justifyContent: 'center' }}><SendButton /></div>
      {state?.error && <p style={{ color: '#ff8a65', fontSize: 13, textAlign: 'center', margin: 0 }}>{state.error}</p>}
    </form>
  );
}
