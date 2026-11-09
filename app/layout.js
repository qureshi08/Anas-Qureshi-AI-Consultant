import './globals.css';

export const metadata = {
  title: 'Anas Qureshi · AI Implementation Engineer',
  description: 'AI Implementation Engineer building LLM integrations, agents and data pipelines for banking, retail and tax compliance work. Open to roles in Saudi Arabia.',
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
