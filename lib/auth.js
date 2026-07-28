/**
 * Who is allowed into /admin.
 *
 * This matters because sign-in is now Google OAuth, and Supabase creates a user
 * for ANY Google account that completes the flow. Being signed in therefore
 * proves nothing about who you are. Every admin page, server action and API
 * route checks against this allowlist, not just "is there a session".
 *
 * Set ADMIN_EMAILS in Vercel (comma-separated) to change who gets in.
 */
const DEFAULT_ADMINS = ['muhammadanasq@gmail.com'];

export function allowedAdminEmails() {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return DEFAULT_ADMINS;
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedAdmin(user) {
  if (!user || !user.email) return false;
  return allowedAdminEmails().includes(user.email.toLowerCase());
}
