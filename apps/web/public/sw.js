// SmartChoice AI Service Worker
// Version 1.0.0

const CACHE_NAME = 'smartchoice-ai-v1'
const RUNTIME_CACHE = 'smartchoice-runtime-v1'
const API_CACHE = 'smartchoice-api-v1'

// Files to cache immediately when SW installs
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline',
  // Add other critical assets
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.smartchoice\.ai\/v1\/search/,
  /^https:\/\/api\.smartchoice\.ai\/v1\/products/,
  /^https:\/\/api\.smartchoice\.ai\/v1\/health/,
]

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker')
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      
      try {
        await cache.addAll(STATIC_CACHE_URLS)
        console.log('[SW] Critical resources cached')
      } catch (error) {
        console.error('[SW] Failed to cache critical resources:', error)
        // Cache individual files that work
        for (const url of STATIC_CACHE_URLS) {
          try {
            await cache.add(url)
          } catch (err) {
            console.warn(`[SW] Failed to cache ${url}:`, err)
          }
        }
      }
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    })()
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker')
  
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys()
      const cachesToDelete = cacheNames.filter(cacheName => 
        cacheName !== CACHE_NAME && 
        cacheName !== RUNTIME_CACHE && 
        cacheName !== API_CACHE
      )
      
      await Promise.all(
        cachesToDelete.map(cacheName => {
          console.log(`[SW] Deleting old cache: ${cacheName}`)
          return caches.delete(cacheName)
        })
      )
      
      // Take control of all clients
      self.clients.claim()
    })()
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }
  
  // Handle API requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request))
    return
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

// Check if request is to API
function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url)
    
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for search requests
    if (request.url.includes('/search')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'You are offline. Please check your internet connection.',
        offline: true,
        data: {
          items: [],
          pagination: { total: 0, page: 1, limit: 20, pages: 0 }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle navigation requests with cache-first strategy for offline support
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving offline page')
    
    // Serve offline page
    const cache = await caches.open(CACHE_NAME)
    const offlinePage = await cache.match('/offline')
    
    if (offlinePage) {
      return offlinePage
    }
    
    // Fallback offline response
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartChoice AI - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0; padding: 2rem; text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; min-height: 100vh;
              display: flex; flex-direction: column; justify-content: center;
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; }
            p { font-size: 1.1rem; opacity: 0.9; }
            .retry-btn { 
              background: white; color: #667eea; 
              border: none; padding: 1rem 2rem; 
              border-radius: 0.5rem; font-size: 1rem;
              margin-top: 2rem; cursor: pointer;
            }
          </style>
        </head>
        <body>
          <h1>🛒 SmartChoice AI</h1>
          <p>You're currently offline</p>
          <p>Check your internet connection and try again</p>
          <button class="retry-btn" onclick="window.location.reload()">
            Try Again
          </button>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url)
    throw error
  }
}

// Background sync for when user comes back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'search-sync') {
    event.waitUntil(syncPendingSearches())
  }
})

// Sync pending searches when back online
async function syncPendingSearches() {
  try {
    // Get pending searches from IndexedDB or other storage
    // This would be implemented based on your offline storage strategy
    console.log('[SW] Syncing pending searches...')
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { searches: 'synced' }
      })
    })
  } catch (error) {
    console.error('[SW] Failed to sync pending searches:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const { title, body, icon, badge, tag, url } = data
  
  const options = {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/icon-96x96.png',
    tag: tag || 'smartchoice-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'dismiss') {
    return
  }
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

// Message handling for communication with app
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_URLS':
      cacheUrls(data.urls)
      break
      
    case 'CLEAR_CACHE':
      clearCaches()
      break
      
    default:
      console.log('[SW] Unknown message type:', type)
  }
})

// Cache specific URLs on demand
async function cacheUrls(urls) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  for (const url of urls) {
    try {
      await cache.add(url)
      console.log(`[SW] Cached: ${url}`)
    } catch (error) {
      console.warn(`[SW] Failed to cache ${url}:`, error)
    }
  }
}

// Clear all caches
async function clearCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
  console.log('[SW] All caches cleared')
}