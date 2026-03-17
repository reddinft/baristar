'use client';

import { useMemo } from 'react';
import Image from 'next/image';

interface CupDisplayProps {
  imageUrl: string;
  misspelledName: string;
  size?: 'sm' | 'md' | 'lg';
}

// Sleeve bounds as fraction of image dimensions
// Based on FLUX cup prompt: sleeve is lower-centre of frame, main focus
const SLEEVE = {
  top: 0.50,     // sleeve starts at 50% down
  bottom: 0.78,  // sleeve ends at 78% down
  left: 0.13,    // sleeve left edge at 13% from left
  right: 0.87,   // sleeve right edge at 87%
};

function getSleeveStyle(containerPx: number) {
  return {
    top: `${SLEEVE.top * 100}%`,
    left: `${SLEEVE.left * 100}%`,
    width: `${(SLEEVE.right - SLEEVE.left) * 100}%`,
    height: `${(SLEEVE.bottom - SLEEVE.top) * 100}%`,
  };
}

// Break a name into lines that fit within maxCharsPerLine
// Prefers breaking on spaces; falls back to hyphenating long words
function breakName(name: string, maxCharsPerLine: number): string[] {
  const words = name.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      // Long single word — hyphenate
      if (current) { lines.push(current); current = ''; }
      let remaining = word;
      while (remaining.length > maxCharsPerLine) {
        lines.push(remaining.slice(0, maxCharsPerLine - 1) + '-');
        remaining = remaining.slice(maxCharsPerLine - 1);
      }
      current = remaining;
    } else if ((current + (current ? ' ' : '') + word).length <= maxCharsPerLine) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Calculate font size and lines to fit within sleeve
function fitNameToSleeve(name: string, sleeveWidthPx: number, sleeveHeightPx: number) {
  // Try font sizes from large to small
  // Each char in Permanent Marker is ~0.62em wide on average
  const CHAR_WIDTH_RATIO = 0.62;
  const LINE_HEIGHT_RATIO = 1.25; // em
  const MAX_LINES = 3;

  for (let fontSize = 32; fontSize >= 10; fontSize -= 1) {
    const charWidth = fontSize * CHAR_WIDTH_RATIO;
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const maxCharsPerLine = Math.floor(sleeveWidthPx / charWidth);
    const lines = breakName(name, maxCharsPerLine);
    const totalHeight = lines.length * lineHeight;

    if (lines.length <= MAX_LINES && totalHeight <= sleeveHeightPx * 0.85) {
      return { fontSize, lines };
    }
  }

  // Last resort: tiny font, force single line truncated
  const lines = [name.slice(0, 18) + (name.length > 18 ? '…' : '')];
  return { fontSize: 10, lines };
}

export function CupDisplay({ imageUrl, misspelledName, size = 'md' }: CupDisplayProps) {
  const sizeMap = { sm: 160, md: 256, lg: 320 };
  const containerPx = sizeMap[size];

  const rotation = useMemo(() => {
    const hash = misspelledName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ((hash % 5) - 2); // -2 to +2 degrees
  }, [misspelledName]);

  const sleeveStyle = getSleeveStyle(containerPx);
  const sleeveWidthPx = (SLEEVE.right - SLEEVE.left) * containerPx;
  const sleeveHeightPx = (SLEEVE.bottom - SLEEVE.top) * containerPx;

  const { fontSize, lines } = useMemo(
    () => fitNameToSleeve(misspelledName, sleeveWidthPx, sleeveHeightPx),
    [misspelledName, sleeveWidthPx, sleeveHeightPx]
  );

  const isPlaceholder = imageUrl === '/placeholder-cup.svg' || !imageUrl;

  return (
    <div
      className="cup-card relative flex-shrink-0"
      style={{ width: containerPx, height: containerPx, overflow: 'hidden' }}
    >
      {isPlaceholder ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-50">
          <svg viewBox="0 0 200 220" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M55 60 L68 180 L132 180 L145 60 Z" fill="#e8d5b5" stroke="#c4a882" strokeWidth="1.5"/>
            <rect x="50" y="100" width="100" height="50" rx="3" fill="#c8a96e"/>
            <rect x="56" y="106" width="88" height="38" rx="2" fill="#f0e6d0"/>
            <rect x="48" y="52" width="104" height="12" rx="6" fill="#8b6914"/>
            <rect x="76" y="46" width="48" height="10" rx="5" fill="#7a5e12"/>
          </svg>
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={`Coffee cup for ${misspelledName}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 256px, 320px"
        />
      )}

      {/* Name overlay — positioned over the sleeve, not centred on whole image */}
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          ...sleeveStyle,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            fontFamily: "'Permanent Marker', cursive",
            fontSize: `${fontSize}px`,
            lineHeight: '1.2',
            color: '#1a1a1a',
            textShadow: '0px 1px 2px rgba(255,255,255,0.45)',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            maxWidth: '100%',
            padding: '0 4px',
          }}
        >
          {lines.join('\n')}
        </div>
      </div>
    </div>
  );
}
