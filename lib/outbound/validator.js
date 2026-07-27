/**
 * Email validation, adapted for a serverless host.
 *
 * IMPORTANT, read before trusting a result: the original OutboundOS validator
 * did a real SMTP handshake on port 25 against the recipient's mail server,
 * which is the only way to actually confirm a mailbox exists. Vercel (like
 * every serverless host) blocks outbound port 25, so that check cannot run here.
 *
 * What this does instead: syntax, disposable-domain, role-address, and a real
 * DNS MX lookup. That reliably catches typos, dead domains, and throwaway
 * addresses, which is most of what kills a cold list. It CANNOT confirm an
 * individual mailbox exists, so the best verdict it will ever return is RISKY,
 * never SAFE. It says so plainly rather than pretending otherwise.
 */
import dns from 'node:dns/promises';

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'throwawaymail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
  'getnada.com', 'temp-mail.org', 'fakeinbox.com', 'maildrop.cc',
]);

const ROLE_PREFIXES = new Set([
  'info', 'admin', 'support', 'sales', 'contact', 'help', 'office', 'hello',
  'enquiries', 'enquiry', 'noreply', 'no-reply', 'postmaster', 'webmaster',
  'billing', 'accounts', 'team', 'mail', 'marketing',
]);

export async function validateEmail(email) {
  const result = {
    email,
    status: 'UNKNOWN',
    score: 0,
    syntax: false,
    mx: false,
    smtp: false,
    disposable: false,
    role: false,
    reason: '',
  };

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    result.status = 'INVALID';
    result.reason = 'Not a valid email address.';
    return result;
  }
  result.syntax = true;
  result.score += 20;

  const [localPart, domain] = email.toLowerCase().split('@');

  if (DISPOSABLE.has(domain)) {
    result.disposable = true;
    result.status = 'INVALID';
    result.reason = 'Disposable/throwaway address. Not worth sending to.';
    result.score = 0;
    return result;
  }

  if (ROLE_PREFIXES.has(localPart)) {
    result.role = true;
  }

  // Real DNS check: does the domain actually accept mail at all?
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      result.status = 'INVALID';
      result.reason = 'Domain has no mail server. Nothing can be delivered here.';
      result.score = 0;
      return result;
    }
    result.mx = true;
    result.score += 45;
  } catch (_) {
    result.status = 'INVALID';
    result.reason = 'Domain does not resolve or accepts no mail.';
    result.score = 0;
    return result;
  }

  // Passed everything we can actually check from here.
  result.status = 'RISKY';
  if (result.role) {
    result.score += 5;
    result.reason = 'Domain is real, but this is a generic role address (info@, sales@), so it likely goes to a shared inbox. Mailbox itself unconfirmed.';
  } else {
    result.score += 20;
    result.reason = 'Syntax and mail server check out. Mailbox existence cannot be confirmed from a serverless host (port 25 blocked), so treat as unverified.';
  }

  return result;
}
