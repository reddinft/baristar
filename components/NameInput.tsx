'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingCup } from './LoadingCup';

export function NameInput() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again?');
        setLoading(false);
        return;
      }

      router.push(`/result/${data.sessionId}`);
    } catch {
      setError('Connection error. Check your wifi, then blame the barista.');
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingCup />;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your actual name (we'll ruin it beautifully)"
            maxLength={50}
            className="w-full px-5 py-4 rounded-xl text-lg border-2 outline-none transition-all"
            style={{
              borderColor: name ? 'var(--caramel)' : '#e0d5c5',
              background: 'white',
              color: 'var(--dark-roast)',
              fontFamily: 'Inter, sans-serif',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--caramel)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,134,11,0.15)'; }}
            onBlur={e => { if (!name) { e.target.style.borderColor = '#e0d5c5'; e.target.style.boxShadow = 'none'; } }}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 px-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full py-4 px-6 rounded-xl text-lg font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: name.trim() ? 'var(--espresso)' : '#9e8878',
            boxShadow: name.trim() ? '0 4px 14px rgba(61,28,2,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (name.trim()) (e.target as HTMLButtonElement).style.background = '#5c2e0a'; }}
          onMouseLeave={e => { if (name.trim()) (e.target as HTMLButtonElement).style.background = 'var(--espresso)'; }}
        >
          ☕ Make My Cup
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--steam-grey)' }}>
          No sign-up. No email. Just your name, mangled with love.
        </p>
      </div>
    </form>
  );
}
