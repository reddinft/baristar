'use client';

import { useState, useEffect } from 'react';

interface GalleryItem {
  id: string;
  original_name: string;
  misspelled_name: string;
  caption: string | null;
  real_photo_url: string;
  generated_image_url: string | null;
  session_id: string | null;
  votes: number;
  created_at: number;
}

function timeAgo(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    loadGallery(0);
  }, []);

  async function loadGallery(newOffset: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/gallery?limit=${LIMIT}&offset=${newOffset}`);
      const data = await res.json();
      if (newOffset === 0) {
        setItems(data.items || []);
      } else {
        setItems((prev) => [...prev, ...(data.items || [])]);
      }
      setTotal(data.total || 0);
      setOffset(newOffset);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(id: string) {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, votes: item.votes + 1 } : item
      )
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          {/* Blurred gallery background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/brand/barry-gallery-bg.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(2px)',
              transform: 'scale(1.05)',
            }}
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(44, 26, 14, 0.6)' }}
          />
          {/* Content */}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between px-6 py-8 gap-4">
            <div>
              <h1
                className="font-display text-4xl font-bold mb-1"
                style={{ color: '#FFF8F0' }}
              >
                The Wall of Shame ⭐
              </h1>
              <p style={{ color: 'rgba(255,248,240,0.8)' }}>
                Every cup Barry&apos;s ever made. He&apos;s proud of all of them.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ background: 'var(--barry-red)', color: 'white' }}
            >
              Let Barry have a go at yours →
            </a>
          </div>
        </div>

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">☕</div>
            <h2
              className="font-display text-2xl font-bold mb-2"
              style={{ color: 'var(--espresso)' }}
            >
              Barry hasn&apos;t ruined anyone&apos;s name yet today. Be the first.
            </h2>
            <p className="mb-6" style={{ color: 'var(--cold-brew)' }}>
              He&apos;s ready. Sharpie in hand. Very confident.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl font-semibold text-white"
              style={{ background: 'var(--barry-red)' }}
            >
              Let Barry have a go at yours →
            </a>
          </div>
        )}

        {/* Gallery grid */}
        {items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <GalleryCard key={item.id} item={item} onVote={handleVote} />
              ))}
            </div>

            {/* Load more */}
            {items.length < total && (
              <div className="text-center mt-8">
                <button
                  onClick={() => loadGallery(offset + LIMIT)}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl font-medium border-2 transition-all disabled:opacity-50"
                  style={{
                    borderColor: 'var(--worn-leather)',
                    color: 'var(--worn-leather)',
                  }}
                >
                  {loading ? 'Loading...' : `Load more (${total - items.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}

        {/* Loading skeleton */}
        {loading && items.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="gallery-card p-4 animate-pulse"
                style={{ height: '260px', background: 'var(--chalk-white)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryCard({
  item,
  onVote,
}: {
  item: GalleryItem;
  onVote: (id: string) => void;
}) {
  return (
    <div className="gallery-card flex flex-col">
      {/* VS compare */}
      <div className="flex items-stretch">
        {/* Real photo */}
        <div className="flex-1 relative">
          <div
            className="absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full z-10"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--cold-brew)' }}
          >
            Real life
          </div>
          <img
            src={item.real_photo_url}
            alt="Real coffee cup"
            className="w-full h-36 object-cover"
          />
        </div>
        {/* VS badge */}
        <div className="flex items-center justify-center w-8 flex-shrink-0" style={{ background: 'var(--chalk-white)' }}>
          <div className="vs-badge">VS</div>
        </div>
        {/* AI generated */}
        <div className="flex-1 relative">
          <div
            className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full z-10"
            style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--cold-brew)' }}
          >
            AI version
          </div>
          {item.generated_image_url ? (
            <img
              src={item.generated_image_url}
              alt="AI generated cup"
              className="w-full h-36 object-cover"
            />
          ) : (
            <div
              className="w-full h-36 flex flex-col items-center justify-center gap-1"
              style={{ background: 'var(--chalk-white)' }}
            >
              <span className="text-3xl">☕</span>
              <span className="text-xs" style={{ color: 'var(--cold-brew)' }}>
                No AI version
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--espresso)' }}>
            {item.original_name}
          </span>
          <span className="text-sm mx-2" style={{ color: 'var(--cold-brew)' }}>
            →
          </span>
          <span
            className="text-base"
            style={{
              fontFamily: "'Permanent Marker', cursive",
              color: 'var(--worn-leather)',
            }}
          >
            {item.misspelled_name}
          </span>
        </div>

        {item.caption && (
          <p className="text-xs italic" style={{ color: 'var(--cold-brew)' }}>
            &ldquo;{item.caption}&rdquo;
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs" style={{ color: 'var(--cold-brew)' }}>
            {timeAgo(item.created_at)}
          </span>
          <button
            onClick={() => onVote(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: item.votes > 0 ? 'var(--worn-leather)' : 'var(--chalk-white)',
              color: item.votes > 0 ? 'white' : 'var(--cold-brew)',
            }}
          >
            🏆 {item.votes} {item.votes === 1 ? 'vote' : 'votes'}
          </button>
        </div>
      </div>
    </div>
  );
}
