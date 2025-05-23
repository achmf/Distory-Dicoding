// This ensures the service worker activates immediately
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// This ensures the service worker takes control immediately
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(clients.claim()); // Take control of all clients as soon as the service worker activates
});

// Handle push events (notifications)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push received");
  console.log("Push data:", event.data?.text());

  let notificationData = {};

  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (error) {
    console.error("Error parsing push data:", error);
    notificationData = {
      title: "New Distory Notification",
      options: {
        body: "You have a new notification",
        icon: "/favicon.png",
      },
    };
  }

  const title = notificationData.title || "Distory Notification";
  const options = {
    body: "You have a new notification",
    icon: "/favicon.png",
    badge: "/favicon.png",
    ...notificationData.options,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification click received");

  event.notification.close();

  let url = "/";

  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  if (event.action === "view") {
    url = `/#/story`;
  }

  const baseUrl = self.location.origin;
  const fullUrl = new URL(url.startsWith("/") ? url : `/${url}`, baseUrl).href;

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === fullUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Cache static assets for offline use
const CACHE_NAME = 'distory-cache-v1';
const staticAssets = [
  '/',
  '/index.html',
  '/styles/styles.css',  // Cache the main styles
  '/styles/coordinates-display.css',  // Cache the secondary styles
  '/styles/sr-only.css',  // Cache the sr-only styles
  '/styles/push-notification-toggle.css',  // Cache the notification styles
  '/scripts/index.js',  // Cache the main JS
  '/scripts/app.js',  // Cache app-specific JS
  '/images/favicon.png',  // Cache the favicon
  '/images/logo.png',  // Cache the logo (add if needed)
  '/manifest.json',  // Cache manifest
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(staticAssets);  // Cache the defined assets
    })
  );
});

// Skip Google Maps API requests from being cached
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('maps.googleapis.com')) {
    // Skip caching Google Maps API requests
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);  // Serve cached content if available, else fetch from network
    })
  );
});

// Clean up old caches when a new service worker is activated
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];  // Only keep the latest cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);  // Delete old caches
          }
        })
      );
    })
  );
});
