'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LOADING_MESSAGES = [
  "They're squinting at the name. The squinting is not going well.",
  'Debating between two spellings. Both are wrong. This is fine.',
  "The playlist is really loud today. This is definitely not their fault.",
  "Consulting with a colleague. The colleague is also confused.",
  "They've written three letters. They seem very confident about all three.",
  "Taking a moment to breathe. The espresso machine is being A Lot right now.",
  "They know your name. They just... chose not to use it.",
];

interface GalleryItem {
  id: string;
  original_name: string;
  misspelled_name: string;
  caption: string | null;
  real_photo_url: string;
  generated_image_url: string | null;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/gallery?limit=6')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setGalleryItems(data.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) {
      setLoadingMsgIndex(Math.floor(Math.random() * LOADING_MESSAGES.length));
      intervalRef.current = setInterval(() => {
        setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 2500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }
      const data = await res.json();
      router.push(`/result/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate your coffee name. Try again?');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4">
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-16 pb-12 w-full max-w-2xl">
        <div className="mb-6">
          <span className="text-6xl">☕</span>
        </div>
        <h1
          className="font-display text-5xl md:text-6xl font-bold mb-4 leading-tight"
          style={{ color: 'var(--espresso)' }}
        >
          What did they call you?
        </h1>
        <p className="text-lg md:text-xl mb-2" style={{ color: 'var(--steam-grey)' }}>
          You gave them one name. They gave it their best shot.
        </p>
        <p className="text-sm" style={{ color: 'var(--steam-grey)' }}>
          See what a barista would write on your cup — powered by AI and a deep misunderstanding of vowels.
        </p>
      </section>

      {/* Input Form */}
      <section className="w-full max-w-md">
        {!loading ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your actual name (we'll ruin it beautifully)"
                maxLength={50}
                className="w-full px-5 py-4 text-lg rounded-xl border-2 outline-none transition-all"
                style={{
                  borderColor: 'var(--caramel)',
                  background: 'white',
                  color: 'var(--dark-roast)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 3px rgba(212, 134, 11, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
                disabled={loading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 px-6 rounded-xl text-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--espresso)',
                color: 'var(--warm-white)',
              }}
              onMouseEnter={(e) => {
                if (name.trim()) (e.target as HTMLElement).style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.opacity = '1';
              }}
            >
              ☕ Make My Cup
            </button>
            {error && (
              <p className="text-center text-sm" style={{ color: 'var(--raspberry)' }}>
                {error}
              </p>
            )}
            <p className="text-center text-xs" style={{ color: 'var(--steam-grey)' }}>
              No sign-up. No email. Just your name, mangled with love.
            </p>
          </form>
        ) : (
          /* Loading State */
          <div className="flex flex-col items-center gap-6 py-8">
            {/* Animated coffee cup */}
            <div className="relative">
              <div className="text-8xl animate-pulse">☕</div>
              {/* Steam wisps */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-2">
                <span className="text-xl opacity-60 steam-1">〜</span>
                <span className="text-xl opacity-60 steam-2">〜</span>
                <span className="text-xl opacity-60 steam-3">〜</span>
              </div>
            </div>
            <p
              className="text-base font-medium text-center"
              style={{ color: 'var(--espresso)' }}
            >
              Our barista is concentrating very, very hard...
            </p>
            <p
              className="text-sm italic text-center max-w-xs transition-all duration-500"
              style={{ color: 'var(--steam-grey)' }}
            >
              &ldquo;{LOADING_MESSAGES[loadingMsgIndex]}&rdquo;
            </p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    background: 'var(--caramel)',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Gallery Preview */}
      {galleryItems.length > 0 && (
        <section className="w-full max-w-4xl mt-20">
          <div className="text-center mb-8">
            <h2
              className="font-display text-3xl font-bold mb-2"
              style={{ color: 'var(--espresso)' }}
            >
              The Wall of Shame
            </h2>
            <p style={{ color: 'var(--steam-grey)' }}>
              Real cups. Real misunderstandings. Real baristas who did their best.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryItems.map((item) => (
              <div key={item.id} className="gallery-card p-4">
                <div className="flex gap-2 mb-3">
                  {item.real_photo_url && (
                    <img
                      src={item.real_photo_url}
                      alt="Real cup"
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  {item.generated_image_url && (
                    <>
                      <div className="vs-badge self-center">VS</div>
                      <img
                        src={item.generated_image_url}
                        alt="AI cup"
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    </>
                  )}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--espresso)' }}>
                  {item.original_name} →{' '}
                  <span className="font-marker" style={{ color: 'var(--caramel)' }}>
                    {item.misspelled_name}
                  </span>
                </p>
                {item.caption && (
                  <p className="text-xs mt-1" style={{ color: 'var(--steam-grey)' }}>
                    {item.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <a
              href="/gallery"
              className="inline-block px-6 py-3 rounded-xl text-sm font-medium border-2 transition-all"
              style={{
                borderColor: 'var(--caramel)',
                color: 'var(--caramel)',
              }}
            >
              See all submissions →
            </a>
          </div>
        </section>
      )}

      {/* Bottom spacer */}
      <div className="h-16" />
    </div>
  );
}
