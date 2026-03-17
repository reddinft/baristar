'use client'
import { useRef, useCallback } from 'react'

export function useBarryAudio() {
  const welcomeRef = useRef<HTMLAudioElement | null>(null)
  const writingRef = useRef<HTMLAudioElement | null>(null)

  const playWelcome = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!welcomeRef.current) {
      welcomeRef.current = new Audio('/audio/barry-welcome.mp3')
    }
    welcomeRef.current.currentTime = 0
    welcomeRef.current.play().catch(() => {}) // ignore autoplay block
  }, [])

  const playWriting = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!writingRef.current) {
      writingRef.current = new Audio('/audio/barry-writing.mp3')
    }
    writingRef.current.currentTime = 0
    writingRef.current.play().catch(() => {})
  }, [])

  const stopAll = useCallback(() => {
    welcomeRef.current?.pause()
    writingRef.current?.pause()
  }, [])

  return { playWelcome, playWriting, stopAll }
}
