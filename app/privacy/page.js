export const metadata = {
  title: 'Privacy Policy — Anas Qureshi, AI Consultant',
  description: 'Privacy policy for anas-qureshi-ai-consultant.vercel.app, including the WhatsApp and website AI assistants.',
};

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      padding: '60px 20px',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: 720, width: '100%' }}>
        <div className="tag">// Legal</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', color: 'var(--ink)', margin: '4px 0 6px' }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 30 }}>
          Last updated August 31, 2026.
        </p>

        <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink2)' }}>
          <p>
            This site (anas-qureshi-ai-consultant.vercel.app) and its AI assistants, including the
            website chat assistant and the WhatsApp receptionist demo (&quot;The 5-Second
            Receptionist&quot;), are operated by Anas Qureshi, an independent AI consultant. This
            page explains what information is collected through these tools and how it is used.
          </p>

          <h2 style={sectionStyle}>What is collected</h2>
          <ul style={listStyle}>
            <li>
              <strong>WhatsApp messages:</strong> if you message the WhatsApp receptionist demo
              number, the messages you send, your WhatsApp phone number, and your WhatsApp profile
              name (if set) are stored so the assistant can hold a conversation with you and so
              Anas can follow up if you ask to speak to a person.
            </li>
            <li>
              <strong>Website chat messages:</strong> messages sent to the chat assistant on this
              site are processed to generate a reply and may be logged for quality and follow-up
              purposes.
            </li>
            <li>
              <strong>Contact details you provide:</strong> if you share your name, business, or
              contact information (by chat, WhatsApp, or a form on this site), it is stored so
              Anas can follow up about the service you asked about.
            </li>
          </ul>

          <h2 style={sectionStyle}>What is not collected</h2>
          <p>
            These assistants never ask for passwords, payment card numbers, or government ID
            numbers, and any such information sent to them should not be trusted as secure. Do not
            send sensitive financial or identity documents through WhatsApp or website chat.
          </p>

          <h2 style={sectionStyle}>How information is used</h2>
          <ul style={listStyle}>
            <li>To generate relevant replies during a conversation (via the Groq and Meta WhatsApp
              Cloud APIs).</li>
            <li>To let Anas follow up personally with people who ask about the service.</li>
            <li>To improve the assistant&apos;s responses over time.</li>
          </ul>
          <p>Information is not sold, and is not shared with third parties except the service
            providers required to operate these tools (Meta&apos;s WhatsApp Cloud API to send and
            receive WhatsApp messages, Groq to generate AI replies, and Supabase to store
            conversation records).</p>

          <h2 style={sectionStyle}>Data retention and deletion</h2>
          <p>
            Conversation records are kept only as long as needed to provide follow-up and improve
            the service. To request that your WhatsApp or chat conversation history be deleted,
            email <a href="mailto:muhammadanasq@gmail.com" style={linkStyle}>muhammadanasq@gmail.com</a> with
            the phone number or details used, and it will be removed.
          </p>

          <h2 style={sectionStyle}>Contact</h2>
          <p>
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:muhammadanasq@gmail.com" style={linkStyle}>muhammadanasq@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

const sectionStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '1.6rem',
  color: 'var(--ink)',
  marginTop: 32,
  marginBottom: 8,
};

const listStyle = {
  paddingLeft: 22,
  marginBottom: 16,
};

const linkStyle = {
  color: 'var(--brick)',
  textDecoration: 'underline',
};
