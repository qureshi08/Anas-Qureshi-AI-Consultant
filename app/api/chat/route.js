import { createAdminClient } from '../../../lib/supabase/admin';

const SYSTEM = `You are the assistant on the website of Anas Qureshi, an AI Consultant who builds AI systems for businesses. You were built by Anas, and you are living proof of what he does.

What Anas does: he builds AI systems that remove manual, repetitive work. Three main things: AI support and sales assistants (like you) trained on a business's own content; workflow automations; and internal tools. His background is automation and AI engineering: he has automated financial risk models in Python, built reporting pipelines with AI analysis that cut work from 80 minutes to seconds, and built apps that run on their own. He works with LLMs, Node.js, Python, and n8n.

His offer: pick one repetitive task your team does by hand, and Anas builds the AI that does it, free, so you see how he works before you pay anything.

How you talk:
- Warm, plain, direct. No corporate buzzwords. Never use dashes.
- Short replies, two to four sentences.
- If the visitor describes a manual or repetitive task, say briefly how Anas would automate it with AI, then invite them to leave their name and email so Anas can build a free version.
- When someone seems interested, asks about working together, or asks about price, ask for their name and email so Anas can personally follow up. Once they give an email, confirm Anas will reach out within a couple of days.
- Be honest. Never invent capabilities or overpromise. If unsure, tell them they can email Anas directly at muhammadanasq@gmail.com.`;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const conversationId = body.conversationId;

  let admin = null;
  try { admin = createAdminClient(); } catch { admin = null; }

  const lastUser = [...messages].reverse().find(m => m && m.role === 'user');

  // persist the conversation + the new user message (best effort, never blocks the reply)
  if (admin && conversationId) {
    try {
      const update = { id: conversationId, updated_at: new Date().toISOString() };
      const emailMatch = lastUser?.content?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (emailMatch) update.email = emailMatch[0];
      await admin.from('conversations').upsert(update, { onConflict: 'id' });
      if (lastUser?.content) {
        await admin.from('chat_messages').insert({ conversation_id: conversationId, role: 'user', content: lastUser.content });
      }
    } catch (e) { /* non-fatal */ }
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return Response.json({ reply: "The assistant isn't switched on yet. You can email Anas directly at muhammadanasq@gmail.com." });
  }

  const chatMessages = [
    { role: 'system', content: SYSTEM },
    ...messages
      .filter(m => m && typeof m.content === 'string')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  let reply = "Sorry, I glitched for a second. Try again, or email Anas at muhammadanasq@gmail.com.";
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: chatMessages,
        temperature: 0.6,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) reply = text;
    else {
      console.error('Groq no-choice response:', JSON.stringify(data).slice(0, 600));
      reply = 'DEBUG: HTTP ' + res.status + ' — ' + (data?.error?.message || JSON.stringify(data).slice(0, 300));
    }
  } catch (e) {
    reply = 'DEBUG (network): ' + (e?.message || 'unknown');
  }

  if (admin && conversationId) {
    try { await admin.from('chat_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply }); } catch (e) {}
  }

  return Response.json({ reply });
}
