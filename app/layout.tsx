import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Baristar — Your name. Destroyed with love.',
  description: 'Find out what a barista would write on your coffee cup. Powered by AI and a deep misunderstanding of vowels.',
  openGraph: {
    title: 'Baristar — Your name. Destroyed with love.',
    description: 'Find out what a barista would write on your coffee cup.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="w-full py-4 px-6 flex items-center justify-between border-b border-amber-100/60">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <span
              className="font-display font-bold text-xl"
              style={{ color: 'var(--espresso)' }}
            >
              Baristar
            </span>
          </a>
          <a
            href="/gallery"
            className="text-sm font-medium transition-colors hover:text-amber-700"
            style={{ color: 'var(--steam-grey)' }}
          >
            Wall of Shame →
          </a>
        </nav>
        <main>{children}</main>
        <footer className="w-full py-8 text-center text-xs mt-16" style={{ color: 'var(--steam-grey)' }}>
          <p>
            ☕ Made with love and poor penmanship.{' '}
            <span className="opacity-60">
              Starbucks built an empire on misspelled cups. We&apos;re just making it official.
            </span>
          </p>
        </footer>
      </body>
    </html>
  );
}
