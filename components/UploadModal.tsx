'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';

interface UploadModalProps {
  sessionId: string;
  originalName: string;
  misspelledName: string;
  onClose: () => void;
  onSuccess: (photoUrl: string) => void;
}

export function UploadModal({
  sessionId,
  originalName,
  misspelledName,
  onClose,
  onSuccess,
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB');
      return;
    }

    setFile(f);
    setError('');
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('originalName', originalName);
      form.append('misspelledName', misspelledName);
      form.append('caption', caption);
      form.append('sessionId', sessionId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed. Try again?');
        setLoading(false);
        return;
      }

      onSuccess(preview!);
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e0d5c5' }}>
          <h2 className="font-display text-xl font-bold" style={{ color: 'var(--espresso)' }}>
            Show us the damage.
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-opacity hover:opacity-60"
            style={{ color: 'var(--steam-grey)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Photo upload */}
          <div>
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                style={{ borderColor: '#d4a068', background: 'var(--cream)' }}
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium" style={{ color: 'var(--espresso)' }}>
                  Tap to upload your real cup
                </span>
                <span className="text-xs" style={{ color: 'var(--steam-grey)' }}>
                  JPEG, PNG, WebP — max 5MB
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--espresso)' }}>
              What did they actually call you?
            </label>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={`e.g. "My name is ${originalName}. They wrote '${misspelledName}'"`}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl border-2 outline-none text-sm"
              style={{ borderColor: '#e0d5c5', background: 'white', color: 'var(--dark-roast)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--caramel)'; }}
              onBlur={e => { e.target.style.borderColor = '#e0d5c5'; }}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'var(--espresso)' }}
          >
            {loading ? 'Uploading...' : '📤 Submit to Wall of Shame'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--steam-grey)' }}>
            Your photo will be visible in the community gallery.
          </p>
        </form>
      </div>
    </div>
  );
}
