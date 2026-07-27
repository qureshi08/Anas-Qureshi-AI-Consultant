import { createAdminClient } from '../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminChatsPage() {
  const admin = createAdminClient();
  const { data: conversations } = await admin.from('conversations').select('*').order('updated_at', { ascending: false }).limit(100);
  const convIds = (conversations || []).map(c => c.id);
  const { data: chatMsgs } = convIds.length
    ? await admin.from('chat_messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: true })
    : { data: [] };

  const convs = conversations || [];
  const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const leads = convs.filter(c => c.email);
  const anon = convs.filter(c => !c.email);

  const Chat = ({ c, hot }) => {
    const msgs = (chatMsgs || []).filter(m => m.conversation_id === c.id);
    const lastVisitor = [...msgs].reverse().find(m => m.role === 'user');
    return (
      <details className="card" style={{ padding: 14, borderColor: hot ? 'var(--brick)' : 'var(--ink)', boxShadow: hot ? '4px 4px 0 var(--brick)' : '4px 4px 0 var(--ink)' }}>
        <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: hot ? 'var(--brick)' : 'var(--ink3)' }}>
              {c.email || 'Anonymous visitor'}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>{fmt(c.updated_at || c.created_at)} &middot; {msgs.length} msgs</span>
          </div>
          {lastVisitor && (
            <div style={{ fontSize: 13, color: 'var(--ink2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              &ldquo;{lastVisitor.content.slice(0, 120)}&rdquo;
            </div>
          )}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 12 }}>
          {msgs.map(m => (
            <div key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '85%',
              background: m.role === 'user' ? 'var(--brick-light)' : 'var(--paper2)',
              border: '1.5px solid rgba(26,18,5,0.25)', borderRadius: 8, padding: '6px 10px',
              fontSize: 13, color: 'var(--ink2)', lineHeight: 1.4,
            }}>
              <span className="mono" style={{ fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase', color: m.role === 'user' ? 'var(--brick)' : 'var(--ink3)', display: 'block', marginBottom: 2 }}>
                {m.role === 'user' ? 'Visitor' : 'AI'}
              </span>
              {m.content}
            </div>
          ))}
        </div>
      </details>
    );
  };

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 20 }}>AI assistant chats</h2>

      <div className="tag" style={{ marginBottom: 8 }}>Leads (left an email) &middot; {leads.length}</div>
      {leads.length === 0 && <p style={{ color: 'var(--ink3)', marginBottom: 16 }}>No email-verified leads from the assistant yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {leads.map(c => <Chat key={c.id} c={c} hot />)}
      </div>

      <details>
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Anonymous visitors &middot; {anon.length}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {anon.map(c => <Chat key={c.id} c={c} />)}
        </div>
      </details>
    </>
  );
}
