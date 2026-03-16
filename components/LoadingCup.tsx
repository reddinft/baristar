'use client';

import { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  "They're squinting at the name. The squinting is not going well.",
  "Debating between two spellings. Both are wrong. This is fine.",
  "The playlist is really loud today. This is definitely not their fault.",
  "Consulting with a colleague. The colleague is also confused.",
  "They've written three letters. They seem very confident about all three.",
  "Taking a moment to breathe. The espresso machine is being A Lot right now.",
  "They know your name. They just... chose not to use it.",
];

export function LoadingCup() {
  const [messageIndex, setMessageIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Animated cup */}
      <div className="relative w-32 h-40">
        <svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Cup body */}
          <path d="M35 60 L50 175 L110 175 L125 60 Z" fill="#e8d5b5" stroke="#c4a882" strokeWidth="2"/>

          {/* Coffee fill (animated) */}
          <clipPath id="cup-clip">
            <path d="M35 60 L50 175 L110 175 L125 60 Z"/>
          </clipPath>
          <rect
            x="30" y="100" width="100" height="80"
            fill="#3d1c02"
            clipPath="url(#cup-clip)"
            style={{
              animation: 'fill-cup 1.5s ease-out forwards',
            }}
          />

          {/* Sleeve */}
          <rect x="30" y="108" width="100" height="48" rx="3" fill="#c8a96e"/>
          {/* Marker scribble on sleeve */}
          <text
            x="80" y="137"
            textAnchor="middle"
            fontFamily="cursive"
            fontSize="14"
            fill="#333"
            style={{ animation: 'pulse-soft 2s ease-in-out infinite' }}
          >
            ???
          </text>

          {/* Lid */}
          <rect x="28" y="50" width="104" height="14" rx="7" fill="#8b6914"/>
          <rect x="60" y="43" width="40" height="11" rx="5.5" fill="#7a5e12"/>

          {/* Steam wisps */}
          <path
            d="M70 35 Q75 22 67 14 Q59 6 63 -4"
            fill="none" stroke="#c4a882" strokeWidth="3" strokeLinecap="round"
            className="steam-1"
          />
          <path
            d="M90 32 Q95 18 87 10 Q79 2 83 -8"
            fill="none" stroke="#c4a882" strokeWidth="3" strokeLinecap="round"
            className="steam-2"
          />
          <path
            d="M110 36 Q115 22 107 14 Q99 6 103 -5"
            fill="none" stroke="#c4a882" strokeWidth="3" strokeLinecap="round"
            className="steam-3"
          />
        </svg>
      </div>

      {/* Loading text */}
      <div className="text-center max-w-sm">
        <p className="text-base font-medium mb-3" style={{ color: 'var(--espresso)' }}>
          Our barista is concentrating very, very hard...
        </p>
        <p
          className="text-sm italic transition-all duration-500"
          style={{ color: 'var(--steam-grey)' }}
        >
          &ldquo;{LOADING_MESSAGES[messageIndex]}&rdquo;
        </p>
      </div>
    </div>
  );
}
