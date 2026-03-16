'use client';

import { useMemo } from 'react';
import Image from 'next/image';

interface CupDisplayProps {
  imageUrl: string;
  misspelledName: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CupDisplay({ imageUrl, misspelledName, size = 'md' }: CupDisplayProps) {
  const rotation = useMemo(() => {
    // Deterministic rotation based on name so it's stable across renders
    const hash = misspelledName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const deg = ((hash % 5) - 2); // -2 to +2 degrees
    return deg;
  }, [misspelledName]);

  const sizeClasses = {
    sm: 'w-40 h-40',
    md: 'w-64 h-64',
    lg: 'w-80 h-80',
  };

  const fontSizes = {
    sm: misspelledName.length > 8 ? '14px' : '18px',
    md: misspelledName.length > 8 ? '20px' : '28px',
    lg: misspelledName.length > 8 ? '24px' : '34px',
  };

  const isPlaceholder = imageUrl === '/placeholder-cup.svg' || !imageUrl;

  return (
    <div className={`cup-card relative ${sizeClasses[size]} flex items-center justify-center overflow-hidden`}>
      {isPlaceholder ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-50">
          {/* Fallback: styled text cup */}
          <div className="relative flex flex-col items-center">
            <svg viewBox="0 0 200 220" className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
              {/* Cup body */}
              <path d="M55 60 L68 180 L132 180 L145 60 Z" fill="#e8d5b5" stroke="#c4a882" strokeWidth="1.5"/>
              {/* Sleeve */}
              <rect x="50" y="100" width="100" height="50" rx="3" fill="#c8a96e"/>
              {/* Sleeve label area */}
              <rect x="56" y="106" width="88" height="38" rx="2" fill="#f0e6d0"/>
              {/* Lid */}
              <rect x="48" y="52" width="104" height="12" rx="6" fill="#8b6914"/>
              <rect x="76" y="46" width="48" height="10" rx="5" fill="#7a5e12"/>
            </svg>
          </div>
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

      {/* CSS name overlay — always rendered on top */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ paddingTop: isPlaceholder ? '10px' : '0' }}
      >
        <span
          className="cup-name-overlay font-marker text-center px-2 leading-tight"
          style={{
            fontSize: fontSizes[size],
            transform: `rotate(${rotation}deg)`,
            color: '#1a1a1a',
            textShadow: '1px 1px 0 rgba(255,255,255,0.3)',
            maxWidth: '90%',
            wordBreak: 'break-word',
          }}
        >
          {misspelledName}
        </span>
      </div>
    </div>
  );
}
