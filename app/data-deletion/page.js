export const metadata = {
  title: 'Data Deletion — Anas Qureshi, AI Consultant',
  description: 'How to request deletion of your WhatsApp or chat conversation data.',
};

export default function DataDeletionPage() {
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
          Data Deletion Instructions
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 30 }}>
          Last updated August 31, 2026.
        </p>

        <div style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink2)' }}>
          <p>
            If you have messaged the WhatsApp receptionist demo (&quot;The 5-Second
            Receptionist&quot;) or the website chat assistant at
            anas-qureshi-ai-consultant.vercel.app, your conversation may be stored so Anas Qureshi
            can respond to you and improve the assistant. You can request that this data be
            deleted at any time.
          </p>

          <h2 style={sectionStyle}>How to request deletion</h2>
          <p>
            Email <a href="mailto:muhammadanasq@gmail.com" style={linkStyle}>muhammadanasq@gmail.com</a>{' '}
            with the subject line &quot;Delete my data&quot;, and include:
          </p>
          <ul style={listStyle}>
            <li>The WhatsApp number you messaged from, or the name you used in website chat.</li>
            <li>Roughly when you messaged, if known.</li>
          </ul>
          <p>
            Your conversation records will be located and permanently deleted within 7 days, and
            you will get a confirmation email once it is done.
          </p>

          <h2 style={sectionStyle}>What gets deleted</h2>
          <p>
            The stored message history tied to your phone number or chat session, and any name or
            business details you shared during the conversation.
          </p>

          <h2 style={sectionStyle}>Contact</h2>
          <p>
            Questions can also be sent to{' '}
            <a href="mailto:muhammadanasq@gmail.com" style={linkStyle}>muhammadanasq@gmail.com</a>.
            See also the <a href="/privacy" style={linkStyle}>Privacy Policy</a>.
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
