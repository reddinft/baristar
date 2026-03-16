'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';

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

interface FullUploadModalProps {
  onClose: () => void;
  onSuccess: (item: GalleryItem) => void;
}

export function FullUploadModal({ onClose, onSuccess }: FullUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState('');
  const [misspelledName, setMisspelledName] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return; }
    setFile(f);
    setError('');
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !originalName.trim() || !misspelledName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('originalName', originalName.trim());
      form.append('misspelledName', misspelledName.trim());
      form.append('caption', caption.trim());

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Upload failed'); setLoading(false); return; }

      // Build a local item to show immediately
      const newItem: GalleryItem = {
        id: data.galleryId,
        original_name: originalName.trim(),
        misspelled_name: misspelledName.trim(),
        caption: caption.trim() || null,
        real_photo_url: preview!,
        generated_image_url: null,
        votes: 0,
        created_at: Math.floor(Date.now() / 1000),
      };
      onSuccess(newItem);
    } catch {
      setError('Connection error. Try again?');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,13,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--warm-white)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e0d5c5' }}>
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--espresso)' }}>
            Show us the damage.
          </h2>
          <button onClick={onClose} className="text-2xl leading-none hover:opacity-60" style={{ color: 'var(--steam-grey)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Photo */}
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center"
              >×</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
              style={{ borderColor: '#d4a068', background: 'var(--cream)' }}
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium" style={{ color: 'var(--espresso)' }}>Upload your real cup photo</span>
              <span className="text-xs" style={{ color: 'var(--steam-grey)' }}>JPEG, PNG, WebP — max 5MB</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFile} className="hidden" />

          {/* Names */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--espresso)' }}>Your actual name</label>
              <input
                type="text" value={originalName} onChange={e => setOriginalName(e.target.value)}
                placeholder="Sarah" maxLength={50} required
                className="w-full px-3 py-2 rounded-lg border-2 outline-none text-sm"
                style={{ borderColor: '#e0d5c5', background: 'white' }}
                onFocus={e => { e.target.style.borderColor = 'var(--caramel)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d5c5'; }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--espresso)' }}>What they wrote</label>
              <input
                type="text" value={misspelledName} onChange={e => setMisspelledName(e.target.value)}
                placeholder="Saarahh" maxLength={50} required
                className="w-full px-3 py-2 rounded-lg border-2 outline-none text-sm font-marker"
                style={{ borderColor: '#e0d5c5', background: 'white' }}
                onFocus={e => { e.target.style.borderColor = 'var(--caramel)'; }}
                onBlur={e => { e.target.style.borderColor = '#e0d5c5'; }}
              />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--espresso)' }}>
              What did they actually call you? <span style={{ color: 'var(--steam-grey)' }}>(optional)</span>
            </label>
            <input
              type="text" value={caption} onChange={e => setCaption(e.target.value)}
              placeholder={`"My name is ${originalName || 'James'}. They wrote '${misspelledName || 'Jamoose'}'"`}
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border-2 outline-none text-sm"
              style={{ borderColor: '#e0d5c5', background: 'white' }}
              onFocus={e => { e.target.style.borderColor = 'var(--caramel)'; }}
              onBlur={e => { e.target.style.borderColor = '#e0d5c5'; }}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!file || !originalName.trim() || !misspelledName.trim() || loading}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
            style={{ background: 'var(--espresso)' }}
          >
            {loading ? 'Uploading...' : '📤 Submit to Wall of Shame'}
          </button>
        </form>
      </div>
    </div>
  );
}
