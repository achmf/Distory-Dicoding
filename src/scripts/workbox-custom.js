// Custom Workbox configuration to handle problematic requests
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst } from "workbox-strategies"
import { ExpirationPlugin } from "workbox-expiration"

// Clean up old caches
cleanupOutdatedCaches()

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST)

// Custom fetch event listener to filter out problematic requests
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip chrome-extension and other browser extension schemes
  if (
    url.protocol === "chrome-extension:" ||
    url.protocol === "moz-extension:" ||
    url.protocol === "safari-extension:" ||
    url.protocol === "ms-browser-extension:" ||
    url.href.includes("gen_204")
  ) {
    return // Let the browser handle these requests normally
  }

  // Handle other requests normally through Workbox
})

// Register routes for different types of content
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          // Ensure we don't cache extension URLs
          if (request.url.includes("chrome-extension") || request.url.includes("moz-extension")) {
            return null
          }
          return request.url
        },
      },
    ],
  }),
)

// Cache Leaflet CSS and JS files
registerRoute(
  ({ url }) => 
    url.origin === "https://unpkg.com" && 
    url.pathname.includes("leaflet"),
  new CacheFirst({
    cacheName: "leaflet-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  }),
)

// Cache OpenStreetMap tiles
registerRoute(
  ({ url }) => 
    url.origin.includes("tile.openstreetmap.org"),
  new CacheFirst({
    cacheName: "map-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
      }),
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

// Background sync for offline stories
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-stories") {
    event.waitUntil(syncOfflineStories())
  }
})

async function syncOfflineStories() {
  try {
    console.log("Background sync: Syncing offline stories...")
    // Implementation for syncing offline stories
    // This would typically involve getting data from IndexedDB and posting to API
  } catch (error) {
    console.error("Background sync failed:", error)
  }
}
