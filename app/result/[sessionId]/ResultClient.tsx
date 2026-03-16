'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CupDisplay } from '@/components/CupDisplay';
import { UploadModal } from '@/components/UploadModal';

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

interface ResultClientProps {
  session: SessionData;
}

export function ResultClient({ session }: ResultClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  const selected = session.misspellings[selectedIndex];
  const imageUrl = session.imageUrl || '/placeholder-cup.svg';

  // Deterministic difficulty score (fun fake metric)
  const difficultyScore = () => {
    const name = session.originalName;
    let score = 3;
    if (name.length > 8) score += 2;
    if (name.length > 12) score += 1;
    const unusual = /[aeiou]{2,}|[^aeiou]{4,}|[xzq]/i.test(name);
    if (unusual) score += 2;
    const silent = /ph|gh|kn|wr|mb|mn/i.test(name);
    if (silent) score += 1;
    return Math.min(score, 10);
  };

  const score = difficultyScore();

  function buildTweetText() {
    return encodeURIComponent(
      `gave Barry Starr my name. he gave it his best shot.\n\nhis best shot was "${selected.name}"\n\nbarrystarr.app — find out what he'd call you ☕`
    );
  }

  function handleInstagramDownload() {
    // Download the cup image for sharing
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `barry-starr-${selected.name}.jpg`;
    link.click();
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 pt-10 pb-20">
        {/* Reveal headline */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--espresso)' }}>
            Close enough.{' '}
            <em className="font-display font-normal" style={{ color: 'var(--steam-grey)', fontSize: '0.8em' }}>
              (It is not close.)
            </em>
          </h1>
          <p className="text-base" style={{ color: 'var(--steam-grey)' }}>
            Your name is a{' '}
            <span className="font-bold" style={{ color: 'var(--caramel)' }}>
              {score}/10
            </span>{' '}
            difficulty for baristas.
          </p>
        </div>

        {/* Main cup display */}
        <div className="flex flex-col items-center gap-6">
          {/* Cup with name overlay */}
          <div className="relative">
            <CupDisplay
              imageUrl={imageUrl}
              misspelledName={selected.name}
              size="lg"
            />
          </div>

          {/* Name reveal */}
          <div className="text-center">
            <p className="text-sm mb-1" style={{ color: 'var(--steam-grey)' }}>
              Your name: <strong>{session.originalName}</strong>
            </p>
            <div
              className="inline-block px-8 py-4 rounded-2xl text-center"
              style={{ background: 'var(--cream)', border: '2px solid #e0d5c5' }}
            >
              <p
                className="font-marker text-5xl md:text-6xl"
                style={{ color: 'var(--dark-roast)', transform: 'rotate(-1deg)', display: 'inline-block' }}
              >
                {selected.name}
              </p>
            </div>
          </div>

          {/* Barista's excuse */}
          <div
            className="w-full max-w-md rounded-xl px-6 py-4 text-center"
            style={{ background: 'white', border: '1px solid #e0d5c5' }}
          >
            <span className="text-xl mr-2">💬</span>
            <span className="italic text-base" style={{ color: 'var(--dark-roast)' }}>
              &ldquo;{selected.excuse}&rdquo;
            </span>
            <p className="text-xs mt-1" style={{ color: 'var(--steam-grey)' }}>
              — Your barista, probably.
            </p>
          </div>

          {/* Other attempts */}
          {session.misspellings.length > 1 && (
            <div className="w-full max-w-md">
              <p className="text-sm mb-3 text-center" style={{ color: 'var(--steam-grey)' }}>
                😅 Our barista also tried:
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {session.misspellings.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className="px-4 py-2 rounded-lg text-sm font-medium font-marker transition-all"
                    style={{
                      background: i === selectedIndex ? 'var(--espresso)' : 'var(--cream)',
                      color: i === selectedIndex ? 'white' : 'var(--dark-roast)',
                      border: `2px solid ${i === selectedIndex ? 'var(--espresso)' : '#e0d5c5'}`,
                      transform: i === selectedIndex ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center mt-2 italic" style={{ color: 'var(--steam-grey)' }}>
                tap to cycle through the attempts
              </p>
            </div>
          )}

          {/* VS Compare card — upload section */}
          {!uploadedPhotoUrl ? (
            <div
              className="w-full max-w-md rounded-2xl p-6 text-center"
              style={{ background: 'var(--cream)', border: '2px dashed #d4a068' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--espresso)' }}>
                Got a real one? Make it a battle.
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--steam-grey)' }}>
                Did the real barista do worse or better than our AI?
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'var(--caramel)' }}
              >
                📷 Upload Your Real Cup
              </button>
            </div>
          ) : (
            /* VS Compare view after upload */
            <div className="w-full max-w-md">
              <p className="text-sm font-medium text-center mb-3" style={{ color: 'var(--espresso)' }}>
                The battle:
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '2px solid #e0d5c5' }}>
                  <p className="text-xs text-center py-1 bg-amber-50 font-medium" style={{ color: 'var(--steam-grey)' }}>AI version</p>
                  <CupDisplay imageUrl={imageUrl} misspelledName={selected.name} size="sm" />
                </div>
                <div className="vs-badge">VS</div>
                <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '2px solid #e0d5c5' }}>
                  <p className="text-xs text-center py-1 bg-amber-50 font-medium" style={{ color: 'var(--steam-grey)' }}>Real life</p>
                  <div className="relative h-40 bg-amber-50">
                    <Image src={uploadedPhotoUrl} alt="Your real cup" fill className="object-cover" sizes="200px" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center mt-3" style={{ color: 'var(--steam-grey)' }}>
                Added to the Wall of Shame →{' '}
                <a href="/gallery" className="underline" style={{ color: 'var(--caramel)' }}>
                  See it in the gallery
                </a>
              </p>
            </div>
          )}

          {/* Share buttons */}
          <div className="w-full max-w-md flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={handleInstagramDownload}
                className="share-btn-instagram flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              >
                📸 Save for Instagram
              </button>
              <a
                href={`https://x.com/intent/post?text=${buildTweetText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-btn-twitter flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
              >
                𝕏 Share on X
              </a>
            </div>
            <div className="flex gap-3">
              <a
                href="/"
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: 'var(--cream)', color: 'var(--espresso)', border: '2px solid #e0d5c5' }}
              >
                🔄 Try another name
              </a>
              <a
                href="/gallery"
                className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: 'var(--cream)', color: 'var(--espresso)', border: '2px solid #e0d5c5' }}
              >
                🏆 Wall of Shame
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <UploadModal
          sessionId={session.sessionId}
          originalName={session.originalName}
          misspelledName={selected.name}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(photoUrl) => {
            setUploadedPhotoUrl(photoUrl);
            setShowUploadModal(false);
          }}
        />
      )}
    </>
  );
}
