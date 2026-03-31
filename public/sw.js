const CACHE = "taptap-v1"
const PRECACHE = [
  "/tap-tap/",
  "/tap-tap/manifest.json",
  "/tap-tap/og-image.png",
]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (e) => {
  // Only handle same-origin GET requests
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((res) => {
        // Cache successful responses for /tap-tap/ assets
        if (res.ok && e.request.url.includes("/tap-tap/")) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      }).catch(() => {
        // Offline fallback: serve root for navigation requests
        if (e.request.mode === "navigate") {
          return caches.match("/tap-tap/")
        }
      })
    })
  )
})
