'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useBarryAudio } from '@/hooks/useBarryAudio';

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

interface VoiceMetadata {
  transcript: string;
  detected_language: string;
  language_probability: number;
  phonetic_hints: string;
  raw_words?: Array<{ word: string; probability: number }>;
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'heard';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Barry audio
  const { playWelcome, playWriting, stopAll } = useBarryAudio();
  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('barry-muted') === 'true';
  });

  // Splash screen state
  const [splashDone, setSplashDone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const visited = localStorage.getItem('barry-visited');
    if (visited) {
      setSplashVisible(false);
      setSplashDone(true);
    }
  }, []);

  const handleSplashTap = useCallback(() => {
    if (!muted) playWelcome();
    localStorage.setItem('barry-visited', 'true');
    setSplashDone(true);
    setTimeout(() => setSplashVisible(false), 700);
  }, [muted, playWelcome]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem('barry-muted', String(next));
    if (next) stopAll();
  }, [muted, stopAll]);

  // Voice state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [voiceMetadata, setVoiceMetadata] = useState<VoiceMetadata | null>(null);
  const [barrysTranscript, setBarrysTranscript] = useState('');
  const [micError, setMicError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setRecordingState('transcribing');
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'audio.webm');
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Transcription failed');
        const data: VoiceMetadata & { avg_logprob: number; words: Array<{ word: string; start: number; end: number; probability: number }> } =
          await res.json();

        const meta: VoiceMetadata = {
          transcript: data.transcript,
          detected_language: data.detected_language,
          language_probability: data.language_probability,
          phonetic_hints: data.phonetic_hints,
          raw_words: data.words?.map((w) => ({ word: w.word, probability: w.probability })),
        };

        setVoiceMetadata(meta);
        setBarrysTranscript(data.transcript);
        setRecordingState('heard');

        // If no name typed yet, pre-fill from transcript
        if (!name.trim()) {
          setName(data.transcript);
        }

        // Auto-generate after 1.5s
        setTimeout(() => {
          triggerGenerate(name.trim() || data.transcript, meta);
        }, 1500);
      } catch {
        setMicError('Transcription failed — you can still type your name below.');
        setRecordingState('idle');
      }
    },
    [name] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const startRecording = useCallback(async () => {
    setMicError('');
    setVoiceMetadata(null);
    setBarrysTranscript('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Barry needs to hear your name — your browser doesn't support microphone access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all tracks to release mic
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        transcribeAudio(blob);
      };

      recorder.start();
      setRecordingState('recording');

      // Auto-stop after 4 seconds
      recordingTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 4000);
    } catch {
      setMicError("Barry needs to hear your name — allow microphone access");
      setRecordingState('idle');
    }
  }, [transcribeAudio, stopRecording]);

  const handleMicClick = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle' || recordingState === 'heard') {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  async function triggerGenerate(nameToUse: string, meta?: VoiceMetadata | null) {
    const canonical = nameToUse.trim();
    if (!canonical) return;
    setLoading(true);
    setError('');
    // Start audio and capture the promise — we'll wait for it to finish before navigating
    // This ensures Barry's writing audio plays to completion, not cut off by navigation
    const audioPromise = !muted ? playWriting() : Promise.resolve();
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: canonical,
          ...(meta ? { voiceMetadata: meta } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }
      const data = await res.json();
      // Wait for Barry to finish his statement before navigating to result
      // If audio already finished (fast API), this resolves immediately
      await audioPromise;
      const resultUrl = data.fromCache
        ? `/result/${data.sessionId}?cached=1`
        : `/result/${data.sessionId}`;
      router.push(resultUrl);
    } catch (err) {
      stopAll(); // Only stopAll on error
      setError(err instanceof Error ? err.message : 'Failed to generate your coffee name. Try again?');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await triggerGenerate(name, voiceMetadata);
  }

  const transcriptDiffers =
    barrysTranscript &&
    name.trim() &&
    barrysTranscript.toLowerCase().trim() !== name.toLowerCase().trim();

  return (
    <div className="min-h-screen flex flex-col items-center px-4">
      {/* Tap-to-start splash overlay — first visit only */}
      {splashVisible && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-700 ${splashDone ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ backgroundColor: 'var(--espresso)' }}
          onClick={handleSplashTap}
        >
          {/* Barry's portrait — circular */}
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 mb-6" style={{ borderColor: 'var(--barry-red)' }}>
            <img src="/brand/barry-portrait.jpg" alt="Barry Starr" className="w-full h-full object-cover" />
          </div>

          {/* His name */}
          <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--oat-milk)' }}>
            Barry Starr
          </h1>
          <p className="text-sm mb-10" style={{ color: 'var(--chalk-white)', opacity: 0.7 }}>
            Your barista today
          </p>

          {/* Tap CTA — pulses gently */}
          <button
            className="px-8 py-4 rounded-full text-white font-semibold text-lg animate-pulse"
            style={{ backgroundColor: 'var(--barry-red)' }}
          >
            ☕ Tap to meet Barry
          </button>

          <p className="text-xs mt-6" style={{ color: 'var(--chalk-white)', opacity: 0.4 }}>
            🔊 Turn your sound on
          </p>
        </div>
      )}

      {/* Mute toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleMute}
          title={muted ? 'Unmute Barry' : 'Mute Barry'}
          aria-label={muted ? 'Unmute Barry' : 'Mute Barry'}
          className="text-sm px-2 py-1 rounded-lg transition-all"
          style={{ color: 'var(--cold-brew)', opacity: 0.7 }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-16 pb-12 w-full max-w-2xl">
        <h1
          className="font-display font-bold mb-4 leading-tight"
          style={{ color: 'var(--espresso)' }}
        >
          <span className="flex items-center justify-center gap-4 text-5xl md:text-6xl">
            <Image
              src="/brand/barry-portrait.jpg"
              alt="Barry Starr"
              width={80}
              height={80}
              className="rounded-full object-cover flex-shrink-0"
              style={{ border: '3px solid var(--worn-leather)' }}
            />
            Hi, I&apos;m Barry Starr.
          </span>
          <span className="block text-3xl md:text-4xl mt-2" style={{ color: 'var(--cold-brew)' }}>
            I&apos;ll be your barista today.
          </span>
        </h1>
        <Image
          src="/brand/barry-hero.jpg"
          alt="Barry Starr behind the coffee counter"
          width={1200}
          height={675}
          className="w-full rounded-xl object-cover mb-8"
          style={{ maxHeight: '300px' }}
          priority
        />
        <p className="text-lg md:text-xl mb-2" style={{ color: 'var(--cold-brew)' }}>
          Tell me your name. I&apos;ll write it on your cup.
        </p>
        <p className="text-sm italic" style={{ color: 'var(--cold-brew)', opacity: 0.8 }}>
          (Results may vary. Actually, results will definitely vary.)
        </p>
      </section>

      {/* Input Form */}
      <section className="w-full max-w-md">
        {!loading ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name input + mic button */}
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name — try 'Marc with a C' or 'Sarah with an H'"
                maxLength={50}
                className="flex-1 px-5 py-4 text-lg rounded-xl border-2 outline-none transition-all"
                style={{
                  borderColor: 'var(--worn-leather)',
                  background: 'var(--chalk-white)',
                  color: 'var(--espresso)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 3px rgba(139, 90, 43, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
                disabled={loading || recordingState === 'recording' || recordingState === 'transcribing'}
                autoFocus
              />
              {/* Mic button */}
              <button
                type="button"
                onClick={handleMicClick}
                disabled={recordingState === 'transcribing' || loading}
                title={
                  recordingState === 'recording'
                    ? 'Click to stop'
                    : recordingState === 'transcribing'
                    ? 'Transcribing...'
                    : "Or speak it — Barry's listening"
                }
                aria-label={
                  recordingState === 'recording'
                    ? 'Click to stop'
                    : recordingState === 'transcribing'
                    ? 'Transcribing...'
                    : "Or speak it — Barry's listening"
                }
                className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all border-2"
                style={{
                  background:
                    recordingState === 'recording' ? 'var(--barry-red)' : 'var(--chalk-white)',
                  borderColor:
                    recordingState === 'recording' ? 'var(--barry-red)' : 'var(--worn-leather)',
                  color:
                    recordingState === 'recording'
                      ? 'white'
                      : recordingState === 'transcribing'
                      ? 'var(--worn-leather)'
                      : 'var(--espresso)',
                  animation:
                    recordingState === 'recording' ? 'pulse 1s infinite' : 'none',
                  opacity: recordingState === 'transcribing' ? 0.6 : 1,
                }}
              >
                {recordingState === 'transcribing' ? (
                  <span className="text-lg animate-spin">⏳</span>
                ) : recordingState === 'recording' ? (
                  /* Waveform bars while recording */
                  <span className="flex items-end gap-0.5 h-5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-1 rounded-full bg-white"
                        style={{
                          height: `${60 + i * 10}%`,
                          animation: `waveBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zm-1 4a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0V5z" />
                    <path d="M5.25 10.5a.75.75 0 0 1 .75.75 6 6 0 0 0 12 0 .75.75 0 0 1 1.5 0 7.5 7.5 0 0 1-6.75 7.455V21h2.25a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5h2.25v-2.295A7.5 7.5 0 0 1 4.5 11.25a.75.75 0 0 1 .75-.75z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Recording label */}
            {recordingState === 'recording' && (
              <p
                className="text-sm text-center font-medium"
                style={{ color: 'var(--barry-red)' }}
              >
                🔴 Listening... (tap mic to stop, auto-stops in 4s)
              </p>
            )}

            {/* Transcribing label */}
            {recordingState === 'transcribing' && (
              <p className="text-sm text-center" style={{ color: 'var(--cold-brew)' }}>
                Barry is listening very hard...
              </p>
            )}

            {/* "Barry heard" confirmation */}
            {recordingState === 'heard' && barrysTranscript && (
              <div
                className="text-sm text-center rounded-lg px-4 py-2"
                style={{
                  background: 'rgba(224, 62, 45, 0.08)',
                  color: 'var(--espresso)',
                  border: '1px solid rgba(224, 62, 45, 0.2)',
                }}
              >
                {transcriptDiffers ? (
                  <>
                    <span style={{ color: 'var(--cold-brew)' }}>You typed:</span>{' '}
                    <strong>{name}</strong>
                    {' '}
                    <span style={{ color: 'var(--cold-brew)' }}>| Barry heard:</span>{' '}
                    <strong style={{ color: 'var(--barry-red)' }}>{barrysTranscript}</strong>
                  </>
                ) : (
                  <>
                    Barry heard: <strong style={{ color: 'var(--barry-red)' }}>{barrysTranscript}</strong>
                  </>
                )}
              </div>
            )}

            {/* Mic error */}
            {micError && (
              <p className="text-center text-xs" style={{ color: 'var(--cold-brew)' }}>
                🎙️ {micError}
              </p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || recordingState === 'recording' || recordingState === 'transcribing'}
              className="w-full py-4 px-6 rounded-xl text-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--barry-red)',
                color: 'white',
              }}
              onMouseEnter={(e) => {
                if (name.trim()) (e.target as HTMLElement).style.background = '#c9362a';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'var(--barry-red)';
              }}
            >
              ☕ Give Barry my name
            </button>
            {error && (
              <p className="text-center text-sm" style={{ color: 'var(--barry-red)' }}>
                {error}
              </p>
            )}
            <p className="text-center text-xs" style={{ color: 'var(--cold-brew)' }}>
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
              Barry is writing very carefully...
            </p>
            <p
              className="text-sm italic text-center max-w-xs transition-all duration-500"
              style={{ color: 'var(--cold-brew)' }}
            >
              &ldquo;{LOADING_MESSAGES[loadingMsgIndex]}&rdquo;
            </p>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{
                    background: 'var(--worn-leather)',
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
              The Wall of Shame ⭐
            </h2>
            <p style={{ color: 'var(--cold-brew)' }}>
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
                  <span className="font-marker" style={{ color: 'var(--worn-leather)' }}>
                    {item.misspelled_name}
                  </span>
                </p>
                {item.caption && (
                  <p className="text-xs mt-1" style={{ color: 'var(--cold-brew)' }}>
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
                borderColor: 'var(--worn-leather)',
                color: 'var(--worn-leather)',
              }}
            >
              See all submissions →
            </a>
          </div>
        </section>
      )}

      {/* Bottom spacer */}
      <div className="h-16" />

      {/* Waveform animation keyframes */}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224, 62, 45, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(224, 62, 45, 0); }
        }
      `}</style>
    </div>
  );
}
