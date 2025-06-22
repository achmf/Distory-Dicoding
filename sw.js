// Main Service Worker for Distory PWA
const CACHE_NAME = "distory-pwa-v1"
const OFFLINE_URL = "./offline.html"

// Get the base path for GitHub Pages
const basePath = "/Distory-Dicoding"

// Assets to cache for offline functionality
const staticAssets = [
  basePath + "/",
  basePath + "/index.html",
  basePath + "/manifest.json",
  basePath + "/offline.html"
]

// Install event - cache essential resources
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
      })
  )
})

// Activate event - clean up old caches
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
            })
          )
        }),
      // Take control of all pages
      self.clients.claim()
    ])
  )
})

// Fetch event - serve cached content when offline with proper filtering
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip extension URLs and problematic requests - DO NOT CACHE OR INTERCEPT
  if (
    url.protocol === "chrome-extension:" ||
    url.protocol === "moz-extension:" ||
    url.protocol === "safari-extension:" ||
    url.protocol === "ms-browser-extension:" ||
    url.protocol === "chrome-search:" ||
    url.protocol === "chrome:" ||
    url.protocol === "moz:" ||
    url.protocol === "about:" ||
    url.href.includes("chrome-extension") ||
    url.href.includes("moz-extension") ||
    url.href.includes("safari-extension") ||
    url.href.includes("ms-browser-extension") ||
    url.href.includes("chrome-search://") ||
    url.href.includes("chrome://") ||
    url.href.includes("moz://") ||
    url.href.includes("about:") ||
    url.href.includes("gen_204") ||
    url.href.includes("maps.googleapis.com/maps/api/mapsjs/gen_204") ||
    url.href.includes("maps.gstatic.com")
  ) {
    // Let browser handle these requests normally - DO NOT INTERCEPT
    return
  }

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Only handle requests for our domain or relative URLs
  if (url.origin !== location.origin && !url.href.startsWith(location.origin)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse
      }

      // Try to fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses or non-basic responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          // Cache the response
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(request, responseToCache)
            } catch (error) {
              console.warn("Failed to cache request:", request.url, error)
            }
          })

          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL) ||
                   caches.match(basePath + "/") ||
                   new Response("Offline - Please check your connection", {
                     status: 503,
                     statusText: "Service Unavailable",
                     headers: { "Content-Type": "text/html" }
                   })
          }
          
          // For other requests, return a generic offline response
          return new Response("Offline", { status: 503 })
        })
    })
  )
})

// Handle push events (notifications)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received")
  let notificationData = {
    title: "Distory Notification",
    options: {
      body: "You have a new notification",
      tag: "distory-notification",
      requireInteraction: false,
      actions: [
        {
          action: "view",
          title: "View Stories"
        },
        {
          action: "dismiss",
          title: "Dismiss"
        }
      ]
    }
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
    })
  )
})

// Handle background sync
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag)

  if (event.tag === "sync-stories") {
    event.waitUntil(syncOfflineStories())
  }
})

// Function to sync offline stories (placeholder)
async function syncOfflineStories() {
  try {
    console.log("Service Worker: Syncing offline stories...")
    // Implementation would go here
  } catch (error) {
    console.error("Service Worker: Sync failed", error)
  }
}
