'use client'
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | null

export function InstallPrompt() {
  const [showBanner, setShowBanner] = useState(false)
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already dismissed
    if (localStorage.getItem('pwa-prompt-dismissed')) return

    // Don't show if already in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const isMobile = isIOS || isAndroid

    if (!isMobile) return

    if (isIOS) {
      setPlatform('ios')
      setShowBanner(true)
    } else if (isAndroid) {
      // Android: wait for native beforeinstallprompt
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setPlatform('android')
        setShowBanner(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-prompt-dismissed', '1')
  }

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div
        className="rounded-xl p-4 flex items-start gap-3 shadow-xl"
        style={{
          background: '#2C1A0E',
          color: '#F5E6C8',
          border: '1px solid rgba(224, 62, 45, 0.3)',
        }}
      >
        <span className="text-2xl flex-shrink-0 mt-0.5">☕</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">Add Barry to your home screen</p>
          {platform === 'ios' ? (
            <p className="text-xs opacity-75">
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> for the full experience
            </p>
          ) : (
            <p className="text-xs opacity-75">
              Install for quick access — no app store needed
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {platform === 'android' && deferredPrompt && (
            <button
              onClick={handleAndroidInstall}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: '#E03E2D', color: 'white' }}
            >
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-xs opacity-50 hover:opacity-80 px-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
