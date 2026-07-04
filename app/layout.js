import './globals.css';

export const metadata = {
  title: 'Anas Qureshi · AI Consultant',
  description: 'I build AI systems that do the repetitive work businesses do by hand: AI assistants, automations, internal tools. The first small build is free.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
