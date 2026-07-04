import { createAdminClient } from '../../../lib/supabase/admin';

const SYSTEM = `You are the assistant on the website of Anas Qureshi, an AI Consultant who builds AI systems for businesses. You were built by Anas, and you are proof of what he does.

What Anas does: he builds AI systems that remove manual, repetitive work. Three main things: AI support and sales assistants (like you) trained on a business's own content; workflow automations; and internal tools. His background is automation and AI engineering: he has automated financial risk models in Python, built reporting pipelines with AI analysis that cut work from 80 minutes to seconds, and built apps that run on their own. He works with LLMs, Node.js, Python, and n8n.

His offer: pick one repetitive task your team does by hand, and Anas builds the AI that does it, free, so you see how he works before you pay anything.

How you talk:
- Warm, plain, direct. No corporate buzzwords. Never use dashes.
- Short replies, two to four sentences.
- If the visitor describes a manual or repetitive task, say briefly how Anas would automate it with AI, then invite them to leave their email and the task so Anas can build a free version.
- If they give an email, confirm that Anas will personally get back to them within a couple of days.
- Be honest. Never invent capabilities or overpromise. If unsure, tell them they can email Anas directly at muhammadanasq@gmail.com.`;

export async function POST(req) {
  let messages = [];
  try { ({ messages } = await req.json()); } catch { messages = []; }
  if (!Array.isArray(messages)) messages = [];

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ reply: "The assistant isn't switched on yet. You can email Anas directly at muhammadanasq@gmail.com." });
  }

  // Lead capture: if the visitor drops an email, save it with what they've said.
  const lastUser = [...messages].reverse().find(m => m && m.role === 'user');
  const emailMatch = lastUser?.content?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) {
    try {
      const admin = createAdminClient();
      const task = messages.filter(m => m.role === 'user').map(m => m.content).join(' | ').slice(0, 800);
      await admin.from('inbound_leads').insert({ email: emailMatch[0], task });
    } catch (e) { /* non-fatal */ }
  }

  const contents = messages
    .filter(m => m && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
      }
    );
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I glitched for a second. Try again, or email Anas at muhammadanasq@gmail.com.";
    return Response.json({ reply });
  } catch (e) {
    return Response.json({ reply: "Something went wrong on my end. Email Anas directly at muhammadanasq@gmail.com." });
  }
}
