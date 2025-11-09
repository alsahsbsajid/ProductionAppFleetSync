// Service Worker for FleetSync Dashboard
// Provides caching, offline functionality, and performance optimizations

const CACHE_NAME = 'fleetsync-v1';
const STATIC_CACHE_NAME = 'fleetsync-static-v1';
const DYNAMIC_CACHE_NAME = 'fleetsync-dynamic-v1';
const API_CACHE_NAME = 'fleetsync-api-v1';

// Cache duration in milliseconds
const CACHE_DURATION = {
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  DYNAMIC: 24 * 60 * 60 * 1000,    // 1 day
  API: 5 * 60 * 1000,              // 5 minutes
  IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/',
  '/_next/static/js/',
  '/_next/static/chunks/',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/vehicles',
  '/api/customers',
  '/api/rentals',
  '/api/dashboard/stats'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(asset => asset));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![
              STATIC_CACHE_NAME,
              DYNAMIC_CACHE_NAME,
              API_CACHE_NAME
            ].includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Main fetch handler with different strategies
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Static assets - Cache First
    if (isStaticAsset(url)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // Strategy 2: API calls - Network First with cache fallback
    if (isApiCall(url)) {
      return await networkFirstWithCache(request, API_CACHE_NAME);
    }
    
    // Strategy 3: Images - Cache First with network fallback
    if (isImage(url)) {
      return await cacheFirst(request, DYNAMIC_CACHE_NAME);
    }
    
    // Strategy 4: HTML pages - Network First
    if (isHtmlPage(request)) {
      return await networkFirst(request, DYNAMIC_CACHE_NAME);
    }
    
    // Strategy 5: Everything else - Network First
    return await networkFirst(request, DYNAMIC_CACHE_NAME);
    
  } catch (error) {
    console.error('Service Worker: Fetch failed:', error);
    
    // Return offline fallback for HTML pages
    if (isHtmlPage(request)) {
      return await getOfflineFallback();
    }
    
    // Return cached version if available
    const cachedResponse = await getCachedResponse(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return network error
    return new Response('Network error', {
      status: 408,
      statusText: 'Network error'
    });
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network First strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Network First with API cache strategy
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_DURATION.API)) {
      // Add stale indicator to response
      const staleResponse = cachedResponse.clone();
      staleResponse.headers.set('X-Cache-Status', 'stale');
      return staleResponse;
    }
    
    throw error;
  }
}

// Helper functions
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.js') ||
    url.pathname.includes('.woff') ||
    url.pathname.includes('.woff2') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  );
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/');
}

function isImage(url) {
  return (
    url.pathname.includes('.jpg') ||
    url.pathname.includes('.jpeg') ||
    url.pathname.includes('.png') ||
    url.pathname.includes('.gif') ||
    url.pathname.includes('.webp') ||
    url.pathname.includes('.svg') ||
    url.pathname.includes('.avif')
  );
}

function isHtmlPage(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Timestamp', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function isExpired(response, maxAge = CACHE_DURATION.STATIC) {
  const timestamp = response.headers.get('X-Cache-Timestamp');
  if (!timestamp) return false;
  
  const age = Date.now() - parseInt(timestamp);
  return age > maxAge;
}

async function getCachedResponse(request) {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const response = await cache.match(request);
    if (response) {
      return response;
    }
  }
  
  return null;
}

async function getOfflineFallback() {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const fallback = await cache.match('/');
  
  if (fallback) {
    return fallback;
  }
  
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>FleetSync - Offline</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f8fafc;
            color: #334155;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          .icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem;
            background: #e2e8f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          h1 {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
            font-weight: 600;
          }
          p {
            margin: 0 0 1.5rem;
            color: #64748b;
          }
          button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
          }
          button:hover {
            background: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </div>
      </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    }
  );
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Service Worker: Background sync triggered');
  // Implement background sync logic here
  // For example, retry failed API requests
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      cacheUrls(event.data.urls)
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      clearAllCaches()
    );
  }
});

// Cache specific URLs
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  await cache.addAll(urls);
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Periodic cache cleanup
setInterval(async () => {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response && isExpired(response)) {
        await cache.delete(request);
      }
    }
  }
}, 60 * 60 * 1000); // Run every hour

console.log('Service Worker: Loaded and ready');