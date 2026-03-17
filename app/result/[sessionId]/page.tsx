'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Misspelling {
  name: string;
  excuse: string;
  pattern: string;
  rank: number;
}

interface SessionData {
  sessionId: string;
  originalName: string;
  primaryMisspelling: string;
  misspellings: Misspelling[];
  imageUrl: string | null;
  createdAt: number;
}

const RANDOM_ROTATIONS = [-4, -2, 0, 2, 3, -3, 1, -1];

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCache = searchParams.get('cached') === '1';
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rotation] = useState(
    () => RANDOM_ROTATIONS[Math.floor(Math.random() * RANDOM_ROTATIONS.length)]
  );

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copied state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSession(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load your coffee name. Try refreshing.');
        setLoading(false);
      });
  }, [sessionId]);

  const activeSpelling = session?.misspellings[activeIndex];

  function getTweetText() {
    if (!session) return '';
    const orig = session.originalName;
    const mis = activeSpelling?.name || session.primaryMisspelling;
    return `The barista heard "${orig}" and wrote "${mis}" ☕ What does your coffee cup say? baristar.app`;
  }

  function getInstagramCaption() {
    if (!session) return '';
    const orig = session.originalName;
    const mis = activeSpelling?.name || session.primaryMisspelling;
    return `My name is ${orig}. This is what the barista heard. ☕\n\nI can only assume the music was very loud.\n\n#Baristar #CoffeeName #TheyTried #${mis.replace(/\s/g, '')}`;
  }

  function handleShareX() {
    const text = encodeURIComponent(getTweetText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }

  async function handleCopyInstagram() {
    try {
      await navigator.clipboard.writeText(getInstagramCaption());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select a textarea
    }
  }

  function handleDownload() {
    if (!session?.imageUrl) return;
    const a = document.createElement('a');
    a.href = session.imageUrl;
    a.download = `barry-starr-${session.originalName}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !session) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('originalName', session.originalName);
      formData.append('misspelledName', activeSpelling?.name || session.primaryMisspelling);
      formData.append('sessionId', session.sessionId);
      if (uploadCaption) formData.append('caption', uploadCaption);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl animate-pulse">☕</div>
        <p style={{ color: 'var(--steam-grey)' }}>Loading your cup...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">😬</div>
        <h1
          className="font-display text-2xl font-bold"
          style={{ color: 'var(--espresso)' }}
        >
          Cup not found
        </h1>
        <p style={{ color: 'var(--steam-grey)' }}>{error || 'This session has expired or never existed.'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 rounded-xl font-medium"
          style={{ background: 'var(--espresso)', color: 'var(--warm-white)' }}
        >
          Try again →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-10">
        {/* Reveal headline */}
        <div className="text-center">
          <h1
            className="font-display text-4xl md:text-5xl font-bold mb-2"
            style={{ color: 'var(--espresso)' }}
          >
            Close enough.{' '}
            <em className="font-display not-italic text-3xl md:text-4xl" style={{ color: 'var(--steam-grey)' }}>
              (It is not close.)
            </em>
          </h1>
          <p style={{ color: 'var(--steam-grey)' }}>
            Your name is <strong style={{ color: 'var(--espresso)' }}>{session.originalName}</strong>. They called you…
          </p>
          {fromCache && (
            <p className="text-xs mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full"
               style={{ background: 'var(--cream)', color: 'var(--steam-grey)', border: '1px solid #e0d5c5' }}>
              ⚡ Barry had this one ready
            </p>
          )}
        </div>

        {/* Cup + name overlay */}
        <div className="cup-card w-64 h-64 flex-shrink-0">
          {session.imageUrl ? (
            <div className="relative inline-block w-64 h-64">
              <img
                src={session.imageUrl}
                alt="Your coffee cup"
                className="w-64 h-64 rounded-xl object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "'Permanent Marker', cursive",
                    color: '#1a1a1a',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.6)',
                  }}
                >
                  {activeSpelling?.name}
                </span>
              </div>
            </div>
          ) : (
            /* Fallback: no image */
            <div
              className="w-64 h-64 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--cream)' }}
            >
              <div className="text-center p-6">
                <div className="text-6xl mb-2">☕</div>
                <span
                  style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontSize: '1.5rem',
                    color: '#1a1a1a',
                    transform: `rotate(${rotation}deg)`,
                    display: 'inline-block',
                  }}
                >
                  {activeSpelling?.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Big name display */}
        <div className="text-center">
          <div
            className="text-5xl md:text-6xl mb-4"
            style={{
              fontFamily: "'Permanent Marker', cursive",
              color: 'var(--espresso)',
              transform: `rotate(${rotation * 0.5}deg)`,
              display: 'inline-block',
            }}
          >
            {activeSpelling?.name}
          </div>
          {activeSpelling?.excuse && (
            <div
              className="text-base italic mt-2 max-w-sm mx-auto"
              style={{ color: 'var(--steam-grey)' }}
            >
              💬 &ldquo;{activeSpelling.excuse}&rdquo;
              <br />
              <span className="text-sm not-italic">— Your barista, probably.</span>
            </div>
          )}
        </div>

        {/* Misspelling tabs */}
        {session.misspellings.length > 1 && (
          <div className="w-full">
            <p className="text-center text-sm mb-3" style={{ color: 'var(--steam-grey)' }}>
              😅 Our barista also tried:
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {session.misspellings.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all border-2"
                  style={{
                    background: activeIndex === i ? 'var(--espresso)' : 'white',
                    color: activeIndex === i ? 'var(--warm-white)' : 'var(--espresso)',
                    borderColor: 'var(--espresso)',
                    fontFamily: activeIndex === i ? "'Permanent Marker', cursive" : 'inherit',
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share section */}
        <div
          className="w-full rounded-2xl p-6"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(61,28,2,0.08)' }}
        >
          <h2
            className="font-display text-xl font-bold mb-4 text-center"
            style={{ color: 'var(--espresso)' }}
          >
            Share the damage
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleShareX}
              className="share-btn-twitter flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-80"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.849L2.498 2.25H8.68l4.258 5.634L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </button>
            <button
              onClick={handleCopyInstagram}
              className="share-btn-instagram flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-80"
            >
              📸 {copied ? 'Caption copied!' : 'Copy Instagram caption'}
            </button>
            {session.imageUrl && (
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all hover:opacity-80"
                style={{
                  borderColor: 'var(--caramel)',
                  color: 'var(--caramel)',
                }}
              >
                ⬇ Download image
              </button>
            )}
          </div>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--steam-grey)' }}>
            <button
              onClick={() => router.push('/')}
              className="underline underline-offset-2 hover:opacity-70"
            >
              🔄 Try another name
            </button>
          </p>
        </div>

        {/* VS Compare / Upload section */}
        <div className="w-full" id="upload">
          <div className="text-center mb-6">
            <h2
              className="font-display text-2xl font-bold mb-2"
              style={{ color: 'var(--espresso)' }}
            >
              Got a real one?
            </h2>
            <p style={{ color: 'var(--steam-grey)' }}>
              Did a real barista do worse than our AI? Make it a battle.
            </p>
          </div>

          {!uploadSuccess ? (
            <form
              onSubmit={handleUpload}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(61,28,2,0.08)' }}
            >
              {/* VS preview */}
              <div className="flex items-center gap-3 mb-2">
                {/* AI side */}
                <div className="flex-1 rounded-xl overflow-hidden" style={{ background: 'var(--cream)' }}>
                  <div className="text-xs text-center py-1 font-medium" style={{ color: 'var(--steam-grey)' }}>
                    AI version
                  </div>
                  {session.imageUrl ? (
                    <img
                      src={session.imageUrl}
                      alt="AI cup"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-4xl">☕</div>
                  )}
                </div>
                <div className="vs-badge flex-shrink-0">VS</div>
                {/* Upload side */}
                <div
                  className="flex-1 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed transition-all hover:border-opacity-80"
                  style={{
                    background: 'var(--cream)',
                    borderColor: 'var(--caramel)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-xs text-center py-1 font-medium" style={{ color: 'var(--steam-grey)' }}>
                    Real life
                  </div>
                  {uploadFile ? (
                    <img
                      src={URL.createObjectURL(uploadFile)}
                      alt="Your cup"
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">📸</span>
                      <span className="text-xs" style={{ color: 'var(--steam-grey)' }}>
                        Add your real one →
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setUploadFile(f);
                }}
              />

              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder='e.g. "My name is James. They wrote Jamoose."'
                className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                style={{
                  borderColor: 'var(--caramel)',
                  color: 'var(--dark-roast)',
                }}
              />

              {uploadError && (
                <p className="text-sm text-center" style={{ color: 'var(--raspberry)' }}>
                  {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="py-3 px-6 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--espresso)', color: 'var(--warm-white)' }}
              >
                {uploading ? 'Uploading...' : '📤 Submit to the Wall of Shame'}
              </button>
            </form>
          ) : (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(61,28,2,0.08)' }}
            >
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--espresso)' }}>
                Submitted!
              </h3>
              <p style={{ color: 'var(--steam-grey)' }}>
                Your cup is now on the Wall of Shame.{' '}
                <a href="/gallery" className="underline" style={{ color: 'var(--caramel)' }}>
                  Go see it →
                </a>
              </p>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
