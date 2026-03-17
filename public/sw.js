const CACHE_NAME = 'barry-starr-v1'
const STATIC_ASSETS = ['/', '/gallery']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Network first for API routes — never intercept
  if (event.request.url.includes('/api/')) return

  // Network first with cache fallback for everything else
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
})
