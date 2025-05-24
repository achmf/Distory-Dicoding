// Service Worker for PWA functionality
const CACHE_NAME = "distory-pwa-v1"
const OFFLINE_URL = "./offline.html"

// Get the base path for GitHub Pages
const basePath = self.location.pathname.replace("/sw.js", "")

// Assets to cache for offline functionality
const staticAssets = [
  basePath + "/",
  basePath + "/index.html",
  basePath + "/manifest.json",
  basePath + "/book.png",
  // Add other critical assets
]

// This ensures the service worker activates immediately
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching essential resources")
        return cache.addAll(staticAssets)
      })
      .then(() => {
        console.log("Service Worker: Skip waiting")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("Service Worker: Cache failed", error)
      }),
  )
})

// This ensures the service worker takes control immediately
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== CACHE_NAME) {
                console.log("Service Worker: Deleting old cache", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      // Take control of all clients
      clients.claim(),
    ]),
  )
})

// Handle push events (notifications)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received")

  let notificationData = {
    title: "Distory Notification",
    options: {
      body: "You have a new notification",
      icon: "./book.png",
      badge: "./book.png",
      tag: "distory-notification",
      requireInteraction: false,
      actions: [
        {
          action: "view",
          title: "View Stories",
          icon: "./book.png",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
  }

  try {
    if (event.data) {
      const pushData = event.data.json()
      notificationData = {
        title: pushData.title || notificationData.title,
        options: {
          ...notificationData.options,
          ...pushData.options,
        },
      }
    }
  } catch (error) {
    console.error("Error parsing push data:", error)
  }

  event.waitUntil(self.registration.showNotification(notificationData.title, notificationData.options))
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification click received")
  event.notification.close()

  let url = basePath + "/"

  if (event.action === "view") {
    url = basePath + "/#/story"
  } else if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url.includes(basePath) && "focus" in client) {
          return client.focus()
        }
      }

      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  // Skip Google Maps API requests from being cached
  if (event.request.url.includes("maps.googleapis.com") || event.request.url.includes("maps.gstatic.com")) {
    return
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse
      }

      // Try to fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return (
              caches.match(OFFLINE_URL) ||
              caches.match(basePath + "/") ||
              new Response("Offline - Please check your connection", {
                status: 503,
                statusText: "Service Unavailable",
              })
            )
          }
        })
    }),
  )
})

// Handle background sync (for offline story uploads)
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag)

  if (event.tag === "sync-stories") {
    event.waitUntil(
      // This would sync offline stories when connection is restored
      syncOfflineStories(),
    )
  }
})

// Function to sync offline stories (placeholder)
async function syncOfflineStories() {
  try {
    console.log("Service Worker: Syncing offline stories...")
    // Implementation would go here to sync offline data
    return Promise.resolve()
  } catch (error) {
    console.error("Service Worker: Sync failed", error)
    throw error
  }
}
