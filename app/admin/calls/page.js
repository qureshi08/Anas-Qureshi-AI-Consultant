import { createAdminClient } from '../../../lib/supabase/admin';
import { updateBooking } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminCallsPage() {
  const admin = createAdminClient();
  const { data: bookings } = await admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(100);
  const list = bookings || [];

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--brick)', marginBottom: 4 }}>Call requests</h2>
      <p className="mono" style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 20 }}>The hottest thing in the funnel</p>

      {list.length === 0 && <p style={{ color: 'var(--ink3)' }}>No call requests yet. They show up here the moment a visitor asks the AI assistant to book time.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(b => (
          <div key={b.id} className="card" style={{ borderColor: b.status === 'requested' ? 'var(--brick)' : 'var(--ink)', boxShadow: b.status === 'requested' ? '4px 4px 0 var(--brick)' : '4px 4px 0 var(--ink)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, color: 'var(--ink)' }}>{b.name || 'No name'}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--brick)', marginLeft: 10 }}>{b.email}</span>
              </div>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>
                {new Date(b.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontSize: 15, color: 'var(--ink2)', marginTop: 6 }}>
              <strong>Wants:</strong> {b.preferred_time}
              {b.timezone ? <span className="mono" style={{ fontSize: 11, color: 'var(--brick)' }}> ({b.timezone})</span> : <span className="mono" style={{ fontSize: 11, color: 'var(--ink3)' }}> (timezone unknown, confirm by email)</span>}
              {b.topic ? ` · ${b.topic}` : ''}
            </div>
            <form action={updateBooking} style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <input type="hidden" name="id" value={b.id} />
              <select name="status" defaultValue={b.status} style={{ flex: '0 1 160px' }}>
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="done">Done</option>
                <option value="no_show">No show</option>
              </select>
              <button className="btn" type="submit" style={{ fontSize: 15, padding: '8px 16px' }}>Save</button>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)' }}>confirm the time with them by email, then mark Confirmed</span>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
