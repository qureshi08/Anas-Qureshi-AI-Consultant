import { createAdminClient } from '../../../lib/supabase/admin';
import { saveInbox, deleteInbox, toggleInbox, saveOutboundSettings } from '../outbound-actions';

export const dynamic = 'force-dynamic';

export default async function InboxesPage() {
  const admin = createAdminClient();
  const { data: accounts } = await admin.from('sending_accounts').select('*').order('id');
  const { data: settingRows } = await admin.from('settings').select('key, value');

  const settings = {};
  (settingRows || []).forEach(r => { settings[r.key] = r.value; });

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { data: todaysLogs } = await admin
    .from('email_logs').select('sending_account_id')
    .eq('status', 'sent').gte('sent_at', startOfDay.toISOString());
  const sentToday = {};
  (todaysLogs || []).forEach(l => { sentToday[l.sending_account_id] = (sentToday[l.sending_account_id] || 0) + 1; });

  const list = accounts || [];
  const oauthReady = settings.google_client_id && settings.google_client_secret;

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--ink)', marginBottom: 4 }}>Inboxes</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>
        Who cold email sends as &middot; rotated automatically
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="tag">How sending is paced</div>
        <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 6 }}>
          Each send rotates to the next active inbox and stops when that inbox hits its daily limit.
          Low and slow keeps you out of spam folders. Sending runs from the campaign page while that
          tab is open, so nothing sends behind your back.
        </p>
      </div>

      {/* ── ACCOUNTS ── */}
      {list.length === 0 && (
        <p style={{ color: 'var(--ink3)', marginBottom: 16 }}>No inboxes yet. Add one below before sending anything.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {list.map(a => {
          const used = sentToday[a.id] || 0;
          const limit = a.daily_limit || 50;
          const pct = Math.min(100, Math.round((used / limit) * 100));
          return (
            <div key={a.id} className="card" style={{ opacity: a.active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--ink)' }}>{a.email}</span>
                  <span className="mono" style={{ fontSize: 10, marginLeft: 10, color: a.refresh_token ? 'var(--forest)' : 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {a.refresh_token ? 'Google connected' : 'App password'}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}>{used} / {limit} sent today</span>
              </div>

              <div style={{ height: 6, background: 'var(--paper2)', borderRadius: 99, overflow: 'hidden', margin: '10px 0' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--brick)' : 'var(--forest)' }} />
              </div>

              <form action={saveInbox} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input type="hidden" name="id" value={a.id} />
                <input name="email" defaultValue={a.email} placeholder="Email" style={{ flex: '1 1 180px' }} />
                <input name="sender_name" defaultValue={a.sender_name || ''} placeholder="Sender name" style={{ flex: '1 1 140px' }} />
                <input name="daily_limit" type="number" min="1" defaultValue={limit} placeholder="Daily limit" style={{ flex: '0 1 110px' }} />
                {!a.refresh_token && (
                  <input name="app_password" type="password" placeholder={a.app_password ? '••••••••' : 'Gmail app password'} style={{ flex: '1 1 160px' }} />
                )}
                <button className="btn" type="submit" style={{ fontSize: 14, padding: '8px 16px' }}>Save</button>
              </form>

              <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                <form action={toggleInbox}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={a.active ? '1' : '0'} />
                  <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', padding: 0 }}>
                    {a.active ? 'Pause this inbox' : 'Reactivate'}
                  </button>
                </form>
                <form action={deleteInbox}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="mono" style={{ background: 'none', border: 'none', color: 'var(--brick)', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', padding: 0 }}>
                    Remove
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ADD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <section className="card">
          <div className="tag">Connect a Google account</div>
          <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '8px 0 12px' }}>
            The better option: sends through the Gmail API, so replies thread properly and everything
            lands in your Sent folder.
          </p>
          {oauthReady ? (
            <a className="btn" href="/api/outbound/google/connect" style={{ fontSize: 16 }}>Connect Gmail &rarr;</a>
          ) : (
            <p className="mono" style={{ fontSize: 11, color: 'var(--brick)' }}>
              Add your Google client ID and secret below first.
            </p>
          )}
        </section>

        <section className="card">
          <div className="tag">Or add an app password</div>
          <p style={{ fontSize: 14, color: 'var(--ink3)', margin: '8px 0 12px' }}>
            Simpler, no Google Cloud setup. Generate one at myaccount.google.com under 2-Step Verification.
          </p>
          <form action={saveInbox} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input name="email" placeholder="you@gmail.com" required style={{ flex: '1 1 160px' }} />
            <input name="sender_name" placeholder="Sender name" style={{ flex: '1 1 130px' }} />
            <input name="app_password" type="password" placeholder="App password" required style={{ flex: '1 1 150px' }} />
            <input name="daily_limit" type="number" min="1" defaultValue={50} style={{ flex: '0 1 100px' }} />
            <button className="btn" type="submit" style={{ fontSize: 15, padding: '9px 18px' }}>+ Add</button>
          </form>
        </section>
      </div>

      {/* ── SETTINGS ── */}
      <details className="card">
        <summary className="mono" style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Signature and Google credentials
        </summary>
        <form action={saveOutboundSettings} style={{ marginTop: 14 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Signature (appended to every email)</span>
            <textarea name="email_signature" defaultValue={settings.email_signature || ''} placeholder="Anas Qureshi&#10;AI Consultant" style={{ minHeight: 80, marginTop: 4, resize: 'vertical' }} />
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Default gap between emails (seconds)</span>
            <input name="delay_seconds" type="number" min="5" defaultValue={settings.delay_seconds || 30} style={{ marginTop: 4 }} />
          </label>

          <div style={{ borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 12 }}>
            <p className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Google OAuth (only needed to connect Gmail accounts)
            </p>
            <input name="google_client_id" defaultValue={settings.google_client_id || ''} placeholder="Google client ID" style={{ marginBottom: 8 }} />
            <input name="google_client_secret" type="password" placeholder={settings.google_client_secret ? '•••••••• (saved)' : 'Google client secret'} />
          </div>

          <button className="btn" type="submit" style={{ marginTop: 14 }}>Save settings</button>
        </form>
      </details>
    </>
  );
}
