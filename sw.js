// Service worker for PWA requirements with push notifications and caching
const CACHE_NAME = 'distory-v2'; // Updated cache version

// Determine the correct base path
const BASE_PATH = self.location.pathname.includes('/Distory-Dicoding/') ? '/Distory-Dicoding/' : '/';

console.log('Service Worker: Base path determined as:', BASE_PATH);
console.log('Service Worker: Location pathname:', self.location.pathname);

// Only cache essential files that we know exist
const essentialFiles = [
  'manifest.json',
  'offline.html'
];

// Icons that should exist
const iconFiles = [
  'icon-72x72.png',
  'icon-96x96.png', 
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png'
];

// Build URLs to cache with BASE_PATH
const urlsToCache = [
  BASE_PATH, // Root path
  ...essentialFiles.map(file => BASE_PATH + file),
  ...iconFiles.map(file => BASE_PATH + file)
];

console.log('Service Worker: URLs to cache:', urlsToCache);

// Install event - cache important resources with error handling
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Opened cache, attempting to cache resources...');
        
        const cachePromises = urlsToCache.map(async (url) => {
          try {
            console.log('Attempting to cache:', url);
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log('Successfully cached:', url);
              return { url, success: true };
            } else {
              console.warn(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
              return { url, success: false, error: `${response.status} ${response.statusText}` };
            }
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error.message);
            return { url, success: false, error: error.message };
          }
        });
        
        const results = await Promise.all(cachePromises);
        const successful = results.filter(result => result.success).length;
        const failed = results.filter(result => !result.success).length;
        
        console.log(`Cache installation completed: ${successful} successful, ${failed} failed`);
        if (failed > 0) {
          const failedUrls = results.filter(result => !result.success).map(result => result.url);
          console.log('Failed URLs:', failedUrls);
        }
        
        return results;
      })
      .catch(error => {
        console.error('Cache installation failed completely:', error);
        // Don't fail the service worker installation just because caching failed
        return [];
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline with better error handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        
        // Try to fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache successful responses for future use (optional)
            if (networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone).catch(error => {
                  console.warn('Failed to cache response:', error);
                });
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.warn('Network request failed:', event.request.url, error);
            
            // If network fails and no cache, show offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match(BASE_PATH + 'offline.html') || 
                     caches.match('/offline.html') ||
                     new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            }
            
            // For other resources, return a generic error
            return new Response('Resource not available offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
      .catch(error => {
        console.error('Cache match failed:', error);
        return fetch(event.request).catch(() => {
          return new Response('Error', { status: 500, statusText: 'Internal Server Error' });
        });
      })
  );
});

// Push event - handle push notifications from server
self.addEventListener('push', (event) => {
  console.log('Service worker received push event:', event);
  
  let notificationData = {
    title: 'Distory',
    body: 'You have a new notification',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png'
  };

  // Try to parse push data
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('Push data received:', pushData);
      
      if (pushData.title) {
        notificationData.title = pushData.title;
      }
      
      if (pushData.options) {
        notificationData.body = pushData.options.body || notificationData.body;
        notificationData.icon = pushData.options.icon || notificationData.icon;
        notificationData.badge = pushData.options.badge || notificationData.badge;
      }
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const showNotification = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: 'distory-notification',
    requireInteraction: true,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  });

  event.waitUntil(showNotification);
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if there's an existing window/tab open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

// Message event - handle messages from the main thread (for testing)
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'test-notification') {
    const { title, options } = event.data.data;
    
    const showNotification = self.registration.showNotification(title, {
      body: options.body || 'Test notification from service worker',
      icon: options.icon || './icon-192x192.png',
      badge: options.badge || './icon-72x72.png',
      tag: 'test-notification',
      requireInteraction: false,
      vibrate: [100, 50, 100]
    });
    
    event.waitUntil(showNotification);
  }
});