'use client'
import { useRef, useCallback } from 'react'

export function useBarryAudio() {
  const welcomeRef = useRef<HTMLAudioElement | null>(null)
  const writingRef = useRef<HTMLAudioElement | null>(null)
  const writingResolveRef = useRef<(() => void) | null>(null)

  const playWelcome = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!welcomeRef.current) {
      welcomeRef.current = new Audio('/audio/barry-welcome.mp3')
    }
    welcomeRef.current.currentTime = 0
    welcomeRef.current.play().catch(() => {})
  }, [])

  // Returns a Promise that resolves when the writing audio finishes naturally
  const playWriting = useCallback((): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve()

    return new Promise((resolve) => {
      if (!writingRef.current) {
        writingRef.current = new Audio('/audio/barry-writing.mp3')
      }
      const audio = writingRef.current

      // Resolve any previous pending promise
      if (writingResolveRef.current) {
        writingResolveRef.current()
        writingResolveRef.current = null
      }

      writingResolveRef.current = resolve

      const onEnded = () => {
        writingResolveRef.current = null
        resolve()
      }
      const onError = () => {
        writingResolveRef.current = null
        resolve() // Don't block navigation on audio failure
      }

      audio.onended = onEnded
      audio.onerror = onError

      audio.currentTime = 0
      audio.play().catch(() => resolve()) // Autoplay blocked — resolve immediately
    })
  }, [])

  const stopAll = useCallback(() => {
    welcomeRef.current?.pause()
    writingRef.current?.pause()
    // Resolve any pending writing promise so navigation isn't blocked
    if (writingResolveRef.current) {
      writingResolveRef.current()
      writingResolveRef.current = null
    }
  }, [])

  return { playWelcome, playWriting, stopAll }
}
