/**
 * Turn whatever got typed or scraped into a URL a browser will actually open.
 *
 * The bug this exists to kill: a value stored as "linkedin.com/in/someone" has
 * no scheme, so an <a href> treats it as a RELATIVE path. On /admin/outbound it
 * resolves to /admin/linkedin.com/in/someone and 404s on our own domain. It
 * looks like a dead profile; it is really a dead link.
 *
 * Normalise on read as well as on write, because rows sourced before the write
 * fix (and anything pasted straight into the form) still carry bare values.
 */

const DANGEROUS = /^\s*(javascript|data|vbscript|file|blob):/i;

export function externalUrl(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Never hand the browser a scheme that can execute.
  if (DANGEROUS.test(s)) return null;

  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;

  const clean = s.replace(/^\/+/, '');
  // A first segment with no dot is a path, not a host, so we have no domain to
  // build from and would otherwise produce something like https://in/someone.
  const firstSegment = clean.split('/')[0];
  if (!firstSegment.includes('.')) return null;

  return `https://${clean}`;
}

/**
 * Same, but tolerant of the shapes a LinkedIn reference actually arrives in:
 * a full URL, a bare host path ("uk.linkedin.com/in/x"), a rooted path
 * ("/in/x"), or a naked handle ("someone-1707a7369").
 */
export function linkedinUrl(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || DANGEROUS.test(s)) return null;

  const direct = externalUrl(s);
  if (direct) return direct;

  // No host in it, so treat what is left as a profile path.
  const path = s.replace(/^\/+/, '');
  if (!path) return null;
  if (/^(in|company|school)\//i.test(path)) return `https://www.linkedin.com/${path}`;
  return `https://www.linkedin.com/in/${path}`;
}
