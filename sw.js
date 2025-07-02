// Service worker for PWA requirements with comprehensive caching
const CACHE_NAME = 'distory-v2';  // Updated cache version
const STATIC_CACHE = 'distory-static-v2';
const DYNAMIC_CACHE = 'distory-dynamic-v2';
const API_CACHE = 'distory-api-v2';

// Comprehensive assets to cache during install
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  // Main application files (will be added dynamically by build)
  // Icons
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png',
  './favicon.png'
];

// Important URLs to cache for offline functionality
const IMPORTANT_URLS = [
  './',
  './#/',
  './#/story',
  './#/add-story',
  './#/login',
  './#/register'
];

// Install event - cache static assets comprehensively
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      // Cache important URLs
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          console.log('Pre-caching important URLs');
          return Promise.allSettled(
            IMPORTANT_URLS.map(url => 
              fetch(url).then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              }).catch(error => {
                console.log(`Failed to pre-cache ${url}:`, error);
              })
            )
          );
        })
    ])
    .then(() => {
      console.log('Service worker installed successfully');
      self.skipWaiting();
    })
    .catch((error) => {
      console.error('Error during service worker install:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service worker activated');
        self.clients.claim();
      })
  );
});

// Fetch event - enhanced caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't API calls
  if (url.origin !== location.origin && !url.pathname.includes('/v1/')) {
    return;
  }

  // Handle API requests with network-first strategy and better caching
  if (url.pathname.includes('/api/') || url.pathname.includes('/v1/') || url.pathname.includes('/stories')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('Serving API response from cache:', request.url);
                return cachedResponse;
              }
              // If no cached response and it's a navigation request, return offline page
              if (request.mode === 'navigate') {
                return caches.match('./offline.html');
              }
              // For other requests, throw error to be handled by the calling code
              throw new Error('No cached response available');
            });
        })
    );
    return;
  }

  // Handle static assets and navigation with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache if it's not a successful response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Determine which cache to use
            const cacheToUse = request.destination === 'document' || 
                             request.url.includes('.html') ||
                             request.url.includes('.css') ||
                             request.url.includes('.js') ||
                             request.url.includes('.png') ||
                             request.url.includes('.jpg') ||
                             request.url.includes('.ico') ? STATIC_CACHE : DYNAMIC_CACHE;

            // Clone the response before caching
            const responseToCache = response.clone();
            caches.open(cacheToUse)
              .then((cache) => {
                console.log(`Caching to ${cacheToUse}:`, request.url);
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            console.log('Network failed for:', request.url);
            // If network fails and it's a navigation request, show offline page
            if (request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
            // For other resources, try to find any cached version
            return caches.match(request);
          });
      })
  );
});

// Handle push events for notifications - enhanced version
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'Distory - New Story Available!',
    body: 'A new story has been published. Click to read it!',
    icon: './icon-192x192.png',
    badge: './icon-96x96.png',
    data: {
      url: './#/story'  // Default to story page
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push notification data received:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          // Ensure the URL is relative and points to our site
          url: data.url && data.url.startsWith('./') ? data.url : 
               data.url && data.url.startsWith('#') ? './' + data.url :
               './#/story'  // Default fallback
        }
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  console.log('Showing notification:', notificationData.title);
  console.log('Notification will open URL:', notificationData.data.url);

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      requireInteraction: true,
      vibrate: [200, 100, 200],  // Add vibration for mobile devices
      tag: 'distory-notification',  // Prevent duplicate notifications
      actions: [
        {
          action: 'view',
          title: 'View Story',
          icon: './icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    }
  );

  event.waitUntil(promiseChain);
});

// Handle notification clicks - enhanced version
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    console.log('User chose to close notification');
    return;
  }

  // Get the URL to open (default action or 'view' action)
  let urlToOpen = event.notification.data?.url || './#/story';
  
  // Ensure the URL is always relative to our site origin
  if (urlToOpen.startsWith('http')) {
    // If it's an absolute URL from another domain, redirect to our story page
    const targetUrl = new URL(urlToOpen);
    if (targetUrl.origin !== self.location.origin) {
      console.log('External URL detected, redirecting to our story page');
      urlToOpen = './#/story';
    }
  } else if (!urlToOpen.startsWith('./') && !urlToOpen.startsWith('#')) {
    // Ensure relative URLs start with ./ 
    urlToOpen = './' + urlToOpen;
  }
  
  // Convert to absolute URL using our origin
  const finalUrl = new URL(urlToOpen, self.location.origin).href;
  
  console.log('Opening URL:', finalUrl);
  console.log('Current origin:', self.location.origin);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log('Found', clientList.length, 'client windows');
        
        // Check if there's already a window/tab open from our origin
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(finalUrl);
          
          console.log('Checking client:', clientUrl.href);
          
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            console.log('Focusing existing window and navigating to:', finalUrl);
            client.focus();
            // Navigate to the specific URL if it's different
            if (client.url !== finalUrl) {
              client.navigate(finalUrl);
            }
            return client;
          }
        }
        
        // If no existing window/tab from our origin, open a new one
        console.log('Opening new window for:', finalUrl);
        if (clients.openWindow) {
          return clients.openWindow(finalUrl);
        }
      })
      .catch((error) => {
        console.error('Error handling notification click:', error);
      })
  );
});
