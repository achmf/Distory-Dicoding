// Minimal service worker for PWA requirements
const CACHE_NAME = 'distory-v1';

// Install event - just acknowledge the install
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
});

// Activate event - clean up old caches if needed
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  self.clients.claim();
});

// Fetch event - let all requests pass through without caching
self.addEventListener('fetch', (event) => {
  // Just let the browser handle all requests normally
  return;
});
