// Mission Linen Supply Service Worker
// Provides offline functionality and caching for quick reference

const CACHE_NAME = 'mission-linen-v1.0';
const CATALOG_CACHE = 'mission-linen-catalog-v1.0';

// Critical resources to cache for offline functionality
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Dynamic resources that update frequently
const DYNAMIC_RESOURCES = [
  '/data/catalog.json'
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Pre-cache catalog data
      caches.open(CATALOG_CACHE).then(cache => {
        console.log('[SW] Pre-caching catalog');
        return cache.addAll(DYNAMIC_RESOURCES);
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      // Take control immediately
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== CACHE_NAME && cacheName !== CATALOG_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with smart strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Different strategies for different resource types
  if (url.pathname === '/data/catalog.json') {
    // Catalog: Network first, cache fallback
    event.respondWith(networkFirstStrategy(event.request, CATALOG_CACHE));
  } else if (STATIC_RESOURCES.includes(url.pathname) || url.pathname === '/') {
    // Static resources: Cache first, network fallback
    event.respondWith(cacheFirstStrategy(event.request, CACHE_NAME));
  } else {
    // Other resources: Network first with cache fallback
    event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
  }
});

// Cache-first strategy (for static resources)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      
      // Update cache in background if possible
      updateCacheInBackground(request, cacheName);
      
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache the response for next time
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Cache-first strategy failed:', error);
    
    // If everything fails, try to return a cached version of index.html
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

// Network-first strategy (for dynamic content)
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Trying network first for:', request.url);
    
    // Try network with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 3000)
      )
    ]);
    
    if (networkResponse.ok) {
      // Update cache with fresh data
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('[SW] Updated cache with fresh data:', request.url);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving stale data from cache:', request.url);
      
      // Add a custom header to indicate stale data
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'service-worker-cache');
      response.headers.set('X-Cache-Date', new Date().toISOString());
      
      return response;
    }
    
    // If this is a navigation request and we have nothing, return offline page
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Offline - Mission Linen Supply</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              background: #0a0a0a; 
              color: #00f5ff; 
              padding: 40px 20px; 
              text-align: center; 
            }
            .offline-icon { font-size: 4rem; margin-bottom: 20px; }
            h1 { color: #39ff14; margin-bottom: 10px; }
            p { color: #888; line-height: 1.5; }
            .retry-btn { 
              background: #00f5ff; 
              color: #000; 
              border: none; 
              padding: 10px 20px; 
              border-radius: 5px; 
              margin-top: 20px; 
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1>Working Offline</h1>
          <p>You're currently offline, but the app is still working with cached data.</p>
          <p>Some features may be limited until you're back online.</p>
          <button class="retry-btn" onclick="location.reload()">Try Again</button>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Update cache in background
async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
      console.log('[SW] Background cache update successful');
    }
  } catch (error) {
    console.log('[SW] Background cache update failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', event => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_STATUS') {
    // Send cache status back to main thread
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Get cache status for debugging
async function getCacheStatus() {
  try {
    const [staticCache, catalogCache] = await Promise.all([
      caches.open(CACHE_NAME),
      caches.open(CATALOG_CACHE)
    ]);
    
    const [staticKeys, catalogKeys] = await Promise.all([
      staticCache.keys(),
      catalogCache.keys()
    ]);
    
    return {
      static: staticKeys.map(request => request.url),
      catalog: catalogKeys.map(request => request.url),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Background sync for favorites updates
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'favorites-sync') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  try {
    console.log('[SW] Syncing favorites in background...');
    // This would sync favorites to a server if we had one
    // For now, just log that sync completed
    console.log('[SW] Favorites sync completed');
  } catch (error) {
    console.log('[SW] Favorites sync failed:', error);
  }
}

console.log('[SW] Service Worker loaded and ready');