import './globals.css';

export const metadata = {
  title: 'Anas Qureshi · AI Consultant',
  description: 'Portfolio: AI systems I have built across retail, regulated finance, banking compliance, hiring, and AI receptionists for local service businesses. Real problems, real outcomes.',
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
