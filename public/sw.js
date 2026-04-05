// Increment CACHE_VERSION on every deployment to force stale clients to update.
const CACHE_VERSION = "taptap-v3"

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      // Precache the shell + static assets. _next/static files have content hashes
      // so they are safe to cache indefinitely.
      c.addAll([
        "/tap-tap/",
        "/tap-tap/manifest.json",
        "/tap-tap/og-image.png",
        "/tap-tap/icon-192.png",
        "/tap-tap/icon-512.png",
      ])
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return

  const url = new URL(e.request.url)

  // _next/static: these have content hashes — cache-first forever
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Everything else under /tap-tap/: network-first, fall back to cache
  if (url.pathname.startsWith("/tap-tap/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(e.request).then((cached) => {
            if (cached) return cached
            if (e.request.mode === "navigate") return caches.match("/tap-tap/")
          })
        )
    )
  }
})

// Allow the page to trigger an immediate update: postMessage({ type: 'SKIP_WAITING' })
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting()
})
