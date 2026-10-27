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
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@700;800;900&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400;1,6..72,700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
