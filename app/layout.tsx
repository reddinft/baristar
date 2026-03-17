import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'Barry Starr | Your Name, Ruined',
  description: 'Barry Starr is the world\'s worst barista. He\'s heard your name. He\'s already misspelled it. Find out what he wrote on your cup.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Barry Starr',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Barry Starr | Your Name, Ruined',
    description: 'Barry Starr is the world\'s worst barista. He\'s heard your name. He\'s already misspelled it.',
    type: 'website',
    url: 'https://barrystarr.app',
    siteName: 'Barry Starr',
    images: [{ url: 'https://barrystarr.app/brand/barry-cup.jpg', width: 800, height: 600, alt: 'A coffee cup with a misspelled name — Barry Starr' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://barrystarr.app/brand/barry-cup.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2C1A0E',
  viewportFit: 'cover',
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
        <ServiceWorkerRegistration />
        <nav className="w-full py-4 px-6 flex items-center justify-between border-b border-amber-100/60">
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <span
              className="font-display font-bold text-xl"
              style={{ color: 'var(--espresso)' }}
            >
              Barry Starr
            </span>
            <span className="text-lg" aria-label="Barry's star signature">⭐</span>
          </a>
          <a
            href="/gallery"
            className="text-sm font-medium transition-colors hover:text-amber-700"
            style={{ color: 'var(--cold-brew)' }}
          >
            Wall of Shame →
          </a>
        </nav>
        <main>{children}</main>
        <footer
          className="w-full py-8 text-center text-xs mt-16"
          style={{
            color: 'var(--cold-brew)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 2rem)',
          }}
        >
          <p>
            Made with love, a Sharpie, and no regard for spelling.{' '}
            <span className="opacity-60">· barrystarr.app</span>
          </p>
        </footer>
        <InstallPrompt />
      </body>
    </html>
  );
}
