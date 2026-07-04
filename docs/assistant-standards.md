# AI Assistant — Standards, Guardrails, and Roadmap

Research-grounded spec for the assistant on the landing page (2026-07-05). This is also sales knowledge: everything here is what Anas builds INTO client assistants, and why they cost real money.

## The canonical failures this design defends against

1. **Air Canada (2024): the company is legally liable for what its chatbot says.** The bot invented a refund policy; a tribunal made the airline honor it. Lesson: a bot must never invent policy, prices, or commitments. Our rule: the assistant quotes typical ranges only and can never agree to discounts, guarantees, refunds, terms, or contracts; commitments come only from Anas.
2. **Chevrolet (2023): prompt injection.** A visitor overrode the bot's instructions and got it to "agree" to sell a $76k car for $1. Our rules: instruction-override attempts are declined in character; the tool layer (booking) validates inputs server-side; the bot cannot bind Anas to anything.
3. **DPD (2024): brand abuse.** The bot was baited into swearing and writing poems trashing DPD; screenshots went viral. Our rule: never produce negative content about anyone or anything, in any framing, joke or not.
4. **Our own found failure (2026-07-05): hallucinated booking.** The bot claimed it had scheduled a call and that a confirmation email was coming; it had no such powers. Fixed with hard honesty rules plus a REAL booking capability (request_booking tool) so it can do the thing instead of pretending.

## Guardrail architecture (input → behavior → output → action), status

**Input guards (live):** per-message length cap (1,000 chars client, 4,000 server), history window cap (last 20 messages to the model), conversation cap (50 user messages, then a polite handoff), timezone auto-detection.
**Behavioral guards (live, in the system prompt):** diagnose-before-prescribe, one question per turn, no menu dumps, buying-signal advancing, no role changes, no prompt disclosure, no negative content, no sensitive-data collection, immediate human handoff on request, stay-in-lane (no legal/medical/financial advice).
**Output guards (live):** no commitments/discounts/contracts, prices as ranges only, booking honesty (never "locked" unless the visitor self-booked Calendly, requests are requests), no invented availability, proof limited to verified facts.
**Action guards (live):** the only tool is request_booking; it requires name + email + preferred time + timezone; the server validates and writes; failures are reported honestly with the Calendly fallback.
**Monitoring (live):** every conversation persisted to Supabase, readable in /admin (Leads vs Anonymous, transcripts, Call requests). The improvement loop: bad transcript → new rule or example in the prompt.

## UX standards, status

Live: persistent conversations across refresh (localStorage), starter quick-reply chips, clickable links, typing indicator, mobile-friendly widget, privacy disclosure line, AI self-identification, replies in the visitor's language.

## Deferred roadmap (build when a client pays for it, or when traffic justifies it)

- **RAG over Anas's content** (answers grounded in retrieved docs instead of prompt-baked facts): the standard for bigger knowledge bases; unnecessary while the knowledge fits in the prompt.
- **Streaming responses:** nicer perceived latency; Groq is already fast.
- **Live human takeover** (Anas joins the chat in real time).
- **Google Calendar integration** for true in-chat slot locking (needs OAuth; sell it, then build it).
- **Metrics dashboard:** containment rate, lead conversion, booking conversion, per-conversation outcome tags.
- **Classifier-based input screening** (LlamaGuard-style) if abuse volume ever warrants it.
- **IP-level rate limiting** (per-visitor caps exist; infra-level limits via Vercel if spam appears).

## Sources

- Air Canada ruling: forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case
- Chevrolet prompt injection: inspectagents.com/blog/chevrolet-ai-failure-breakdown
- DPD incident and lessons: cxtoday.com/contact-center/3-times-customer-chatbots-went-rogue-and-the-lessons-we-need-to-learn
- Guardrail architecture: arthur.ai/blog/best-practices-for-building-agents-guardrails, orq.ai/blog/llm-guardrails, datadoghq.com/blog/llm-guardrails-best-practices
