// Temporary diagnostic route — lists available Groq model IDs so we can pick
// a valid replacement for a deprecated one. Delete after use.
export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: 'no key' });
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await res.json();
  const ids = (data?.data || []).map((m) => m.id);
  return Response.json({ ok: res.ok, ids });
}
