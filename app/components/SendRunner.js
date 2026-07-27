'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Drives the send loop from the browser. Each tick calls /api/outbound/send-one
 * (one email, returns fast), then waits the configured delay before the next.
 * This is what makes cold email work on a serverless host: the waiting happens
 * here, not in a function that would get killed.
 *
 * Trade-off worth knowing: this tab has to stay open while it runs.
 */
export default function SendRunner({ campaignId, pendingCount, defaultDelay = 30 }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [log, setLog] = useState([]);
  const [delay, setDelay] = useState(defaultDelay);
  const [filter, setFilter] = useState('SAFE_RISKY');
  const [finished, setFinished] = useState(null);
  const stopRef = useRef(false);

  const addLog = (line, kind = 'info') =>
    setLog(prev => [{ line, kind, at: new Date().toLocaleTimeString('en-GB') }, ...prev].slice(0, 60));

  async function run() {
    stopRef.current = false;
    setRunning(true);
    setFinished(null);
    setSent(0);
    setFailed(0);
    setLog([]);

    let localSent = 0;

    while (!stopRef.current) {
      let data;
      try {
        const res = await fetch('/api/outbound/send-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, safetyFilter: filter }),
        });
        data = await res.json();
        if (!res.ok) {
          addLog(data.error || `Request failed (${res.status})`, 'error');
          setFinished(data.error || 'Stopped on an error.');
          break;
        }
      } catch (err) {
        addLog(`Network error: ${err.message}`, 'error');
        setFinished('Stopped: network error.');
        break;
      }

      if (data.done) {
        setFinished(data.message || 'All done.');
        addLog(data.message || 'All done.', 'done');
        break;
      }

      if (data.sent) {
        localSent += 1;
        setSent(s => s + 1);
        addLog(`Sent to ${data.to} via ${data.via}`, 'ok');
      } else {
        setFailed(f => f + 1);
        addLog(`Failed ${data.to}: ${data.error}`, 'error');
      }

      // Pace the next one. Checked in small slices so Stop feels instant.
      for (let waited = 0; waited < delay && !stopRef.current; waited++) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setRunning(false);
    if (localSent > 0) router.refresh();
  }

  function stop() {
    stopRef.current = true;
    setRunning(false);
    setFinished('Stopped by you.');
    addLog('Stopped.', 'done');
    router.refresh();
  }

  const kindColor = { ok: 'var(--forest)', error: 'var(--brick)', done: 'var(--amber)', info: 'var(--ink3)' };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="tag">Send</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
        <label style={{ flex: '1 1 160px' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Gap between emails</span>
          <select value={delay} onChange={e => setDelay(Number(e.target.value))} disabled={running} style={{ marginTop: 4 }}>
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
        </label>

        <label style={{ flex: '1 1 200px' }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Who to include</span>
          <select value={filter} onChange={e => setFilter(e.target.value)} disabled={running} style={{ marginTop: 4 }}>
            <option value="SAFE_RISKY">Validated only (skips dead domains)</option>
            <option value="SAFE_ONLY">Confirmed safe only</option>
            <option value="ALL">Everything except known-invalid</option>
          </select>
        </label>

        {!running ? (
          <button className="btn" onClick={run} disabled={pendingCount === 0} style={{ fontSize: 17 }}>
            Start sending
          </button>
        ) : (
          <button
            onClick={stop}
            className="mono"
            style={{
              background: 'var(--ink)', color: 'var(--paper)', border: '2.5px solid var(--ink)',
              borderRadius: 8, padding: '11px 24px', cursor: 'pointer', fontSize: 13,
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}
          >
            Stop
          </button>
        )}
      </div>

      {running && (
        <p className="mono" style={{ fontSize: 11, color: 'var(--brick)', marginTop: 12 }}>
          Sending. Keep this tab open, closing it stops the run.
        </p>
      )}

      {(sent > 0 || failed > 0 || finished) && (
        <div style={{ display: 'flex', gap: 20, marginTop: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--forest)' }}>{sent} sent</span>
          {failed > 0 && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--brick)' }}>{failed} failed</span>}
          {finished && <span className="mono" style={{ fontSize: 12, color: 'var(--ink3)' }}>{finished}</span>}
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: 14, maxHeight: 220, overflowY: 'auto', borderTop: '1.5px dashed rgba(26,18,5,0.15)', paddingTop: 10 }}>
          {log.map((l, i) => (
            <div key={i} className="mono" style={{ fontSize: 11, color: kindColor[l.kind], padding: '2px 0' }}>
              {l.at} &middot; {l.line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
