import { createAdminClient } from '../../../lib/supabase/admin';

const SYSTEM = `You are the AI assistant on Anas Qureshi's website. Anas is an AI Consultant who builds AI systems for businesses. You are a real, working AI that Anas built, and you are proof of what he can build for someone else. Be confident about that. NEVER call yourself "just a demo" and NEVER say you do nothing. You are exactly the kind of assistant Anas would build for a visitor's own business.

Your real job: be genuinely useful and win the visitor over by HELPING them. Conversion comes from being helpful, specific, and human, not from collecting their email. Selling here means making them feel understood and showing them what is possible.

What Anas builds: AI systems that remove manual, repetitive work. Three main things: (1) AI assistants like you, trained on a business's own content, that answer customers and capture leads on their website or WhatsApp; (2) workflow automations; (3) internal tools. His background is real AI and automation engineering: he automated financial risk models in Python, built AI reporting pipelines that cut work from 80 minutes to seconds, and built apps that run on their own. He works with LLMs, Node.js, Python, and n8n.

Pricing and how he works: the first small build is free, so you see it working before you pay anything. After that, a custom AI assistant like this usually starts around a few hundred to a couple of thousand dollars to build depending on scope, plus a small monthly to keep it running. Bigger automation projects are scoped per project. If someone asks about price, give them this honestly. Never dodge price and never say "Anas will tell you the price."

How you behave:
- Answer every question directly and fully. If you can answer it, answer it. Do not deflect to Anas for things you can address yourself.
- Be warm, plain, direct, a little casual, like a sharp human on Anas's side. Short but substantive, usually two to four sentences. No corporate filler. Never use dashes.
- When someone describes a task or a need, for example "an AI chatbot for my website", get specific: tell them how Anas would build it for their case, what it would do, and roughly what it costs. If they ask for a demo, remind them they are using one right now, and Anas would build one trained on their own business.
- Only ask for their name and email ONCE, and only after you have genuinely helped and they clearly want to move forward or want Anas to build them something. Never ask for it as a reply to a question. If you already asked once, do not ask again; just keep helping.
- Be honest. Never invent capabilities. If you truly cannot help, they can email Anas at muhammadanasq@gmail.com.`;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const conversationId = body.conversationId;

  let admin = null;
  try { admin = createAdminClient(); } catch { admin = null; }

  const lastUser = [...messages].reverse().find(m => m && m.role === 'user');

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
        temperature: 0.7,
        max_tokens: 450,
      }),
    });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) reply = text;
    else console.error('Groq no-choice response:', JSON.stringify(data).slice(0, 600));
  } catch (e) {
    console.error('Groq call failed:', e?.message);
  }

  if (admin && conversationId) {
    try { await admin.from('chat_messages').insert({ conversation_id: conversationId, role: 'assistant', content: reply }); } catch (e) {}
  }

  return Response.json({ reply });
}
