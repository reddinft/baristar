'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface GalleryItem {
  id: string;
  original_name: string;
  misspelled_name: string;
  caption: string | null;
  real_photo_url: string;
  generated_image_url: string | null;
  votes: number;
  created_at: number;
}

export function GalleryTeaser() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gallery?limit=6')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-amber-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 py-12 text-center rounded-2xl border-2 border-dashed" style={{ borderColor: '#e0d5c5' }}>
        <p className="text-3xl mb-3">☕</p>
        <p className="font-medium mb-1" style={{ color: 'var(--espresso)' }}>Nothing here yet.</p>
        <p className="text-sm" style={{ color: 'var(--steam-grey)' }}>
          Be the first brave soul to share the evidence.
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--steam-grey)' }}>
          Someone out there wrote something unhinged on your cup.
        </p>
        <a
          href="/gallery"
          className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--caramel)' }}
        >
          Upload the proof →
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(item => (
          <div key={item.id} className="gallery-card group cursor-pointer">
            <div className="relative h-28 bg-amber-50">
              <Image
                src={item.real_photo_url}
                alt={`${item.original_name} → ${item.misspelled_name}`}
                fill
                className="object-cover"
                sizes="200px"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--espresso)' }}>
                {item.original_name} → <span className="font-marker">{item.misspelled_name}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-6">
        <a
          href="/gallery"
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--caramel)' }}
        >
          See the full Wall of Shame →
        </a>
      </div>
    </div>
  );
}
