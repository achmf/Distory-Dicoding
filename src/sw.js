import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst, NetworkOnly } from "workbox-strategies"

// Clean up old caches
cleanupOutdatedCaches()

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST)

const basePath = "/Distory-Dicoding"

// CRITICAL: Filter out problematic requests BEFORE they reach cache
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip ALL extension and problematic URLs
  if (
    url.protocol === "chrome-extension:" ||
    url.protocol === "moz-extension:" ||
    url.protocol === "safari-extension:" ||
    url.protocol === "ms-browser-extension:" ||
    url.href.includes("gen_204") ||
    url.href.includes("chrome-extension") ||
    url.href.includes("moz-extension") ||
    url.href.includes("safari-extension") ||
    url.href.includes("ms-browser-extension") ||
    url.href.includes("maps.googleapis.com/maps/api/mapsjs/gen_204")
  ) {
    // Let browser handle these requests normally - DO NOT INTERCEPT
    return
  }

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Handle other requests through Workbox
})

// Register routes for different types of content
registerRoute(
  ({ request, url }) => {
    // Skip extension URLs
    if (
      url.href.includes("chrome-extension") ||
      url.href.includes("moz-extension") ||
      url.href.includes("safari-extension") ||
      url.href.includes("ms-browser-extension")
    ) {
      return false
    }
    return request.destination === "image"
  },
  new CacheFirst({
    cacheName: "images",
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Double-check: don't cache extension URLs
          if (
            request.url.includes("chrome-extension") ||
            request.url.includes("moz-extension") ||
            request.url.includes("safari-extension") ||
            request.url.includes("ms-browser-extension")
          ) {
            return null
          }
          return request.url
        },
      },
    ],
  }),
)

registerRoute(
  ({ url }) => url.origin === "https://dicoding-story-api.vercel.app",
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 10,
  }),
)

// Explicitly skip problematic requests
registerRoute(
  ({ url }) =>
    url.href.includes("maps.googleapis.com/maps/api/mapsjs/gen_204") ||
    url.href.includes("chrome-extension") ||
    url.href.includes("moz-extension") ||
    url.href.includes("safari-extension") ||
    url.href.includes("ms-browser-extension"),
  new NetworkOnly(),
)

// Handle push events (notifications)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received")

  let notificationData = {
    title: "Distory Notification",
    options: {
      body: "You have a new notification",
      icon: basePath + "/book.png",
      badge: basePath + "/book.png",
      tag: "distory-notification",
      requireInteraction: false,
      actions: [
        {
          action: "view",
          title: "View Stories",
          icon: basePath + "/book.png",
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
      for (const client of windowClients) {
        if (client.url.includes(basePath) && "focus" in client) {
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

// Handle background sync
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync triggered", event.tag)

  if (event.tag === "sync-stories") {
    event.waitUntil(syncOfflineStories())
  }
})

// Function to sync offline stories
async function syncOfflineStories() {
  try {
    console.log("Service Worker: Syncing offline stories...")

    const db = await openDB()
    const transaction = db.transaction(["stories"], "readonly")
    const store = transaction.objectStore("stories")
    const offlineStories = await store.getAll()

    for (const story of offlineStories) {
      try {
        const response = await fetch("https://dicoding-story-api.vercel.app/v1/stories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${story.token}`,
          },
          body: JSON.stringify({
            description: story.description,
            lat: story.lat,
            lon: story.lon,
            photo: story.photo,
          }),
        })

        if (response.ok) {
          const deleteTransaction = db.transaction(["stories"], "readwrite")
          const deleteStore = deleteTransaction.objectStore("stories")
          await deleteStore.delete(story.id)
          console.log(`Story ${story.id} synced successfully`)
        }
      } catch (error) {
        console.error(`Failed to sync story ${story.id}:`, error)
      }
    }

    return Promise.resolve()
  } catch (error) {
    console.error("Service Worker: Sync failed", error)
    throw error
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("DistoryDB", 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains("stories")) {
        db.createObjectStore("stories", { keyPath: "id" })
      }
    }
  })
}
