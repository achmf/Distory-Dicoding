// This ensures the service worker activates immediately
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...")
  self.skipWaiting() // Force the waiting service worker to become the active service worker
})

// This ensures the service worker takes control immediately
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...")
  event.waitUntil(clients.claim()) // Take control of all clients as soon as the service worker activates
})

// Handle push events (notifications)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received")
  console.log("Push data:", event.data?.text())

  let notificationData = {}

  try {
    if (event.data) {
      notificationData = event.data.json()
    }
  } catch (error) {
    console.error("Error parsing push data:", error)
    notificationData = {
      title: "New Distory Notification",
      options: {
        body: "You have a new notification",
        icon: "/Distory-Dicoding/book.png",
      },
    }
  }

  const title = notificationData.title || "Distory Notification"
  const options = {
    body: "You have a new notification",
    icon: "/Distory-Dicoding/book.png",
    badge: "/Distory-Dicoding/book.png",
    ...notificationData.options,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification click received")

  event.notification.close()

  let url = "/"

  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url
  }

  if (event.action === "view") {
    url = `/#/story`
  }

  const baseUrl = self.location.origin
  const fullUrl = new URL(url.startsWith("/") ? `/Distory-Dicoding${url}` : `/Distory-Dicoding/${url}`, baseUrl).href

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === fullUrl && "focus" in client) {
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
      }
    }),
  )
})

// Cache static assets for offline use
const CACHE_NAME = "distory-cache-v1"
const staticAssets = [
  "/Distory-Dicoding/",
  "/Distory-Dicoding/index.html",
  "/Distory-Dicoding/styles/styles.css",
  "/Distory-Dicoding/styles/coordinates-display.css",
  "/Distory-Dicoding/styles/sr-only.css",
  "/Distory-Dicoding/styles/push-notification-toggle.css",
  "/Distory-Dicoding/scripts/index.js",
  "/Distory-Dicoding/scripts/app.js",
  "/Distory-Dicoding/book.png",
  "/Distory-Dicoding/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(staticAssets)
    }),
  )
})

// Skip Google Maps API requests from being cached
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("maps.googleapis.com")) {
    // Skip caching Google Maps API requests
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request)
    }),
  )
})

// Clean up old caches when a new service worker is activated
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})
