/* Service worker mínimo para PWA Preventa (shell + assets estáticos). */
const CACHE = "brabo-preventa-v1"
const PRECACHE = ["/preventa", "/manifest-preventa.webmanifest", "/images/brabo-logo.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // API: network only
  if (url.pathname.startsWith("/api") || url.hostname.includes("api")) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith("/preventa") || url.pathname.startsWith("/_next") || url.pathname.startsWith("/images"))) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetched
    })
  )
})
