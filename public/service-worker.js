// Service Worker for Stork SMS PWA
const CACHE_NAME = 'stork-sms-v2';
const urlsToCache = [
  '/',
  '/stork-app-icon.png',
  '/stork-app-icon-512x512.png',
  '/monochrome-app-icon.png',
  '/noti/11L-stork_squawk_message-1752946389647.mp3',
  '/Light-1-min.webp',
  '/Dark-1-min.png',
  '/Paper-Texture-7.jpg'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip WebSocket requests
  if (event.request.url.includes('ws://') || event.request.url.includes('wss://')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();
        
        // Update cache with fresh response
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  // Detect if we're on Android for better icon choice
  const isAndroid = /Android/i.test(navigator.userAgent);
  const notificationIcon = isAndroid ? '/monochrome-app-icon.png' : '/stork-app-icon.png';
  
  let notificationData = {
    title: 'Stork SMS',
    body: 'You have a new message',
    icon: '/stork-app-icon-512x512.png', // Large icon for notification body
    badge: '/monochrome-app-icon.png', // Small monochrome icon
    image: '/stork-dapp-webpreview.png', // Optional banner image
    vibrate: [200, 100, 200],
    tag: 'stork-notification',
    renotify: true,
    requireInteraction: false,
    silent: false, // Ensure notification makes sound (system default)
    data: {}
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        // Ensure our icons are always used
        icon: data.icon || '/stork-app-icon-512x512.png',
        badge: data.badge || '/monochrome-app-icon.png',
        image: data.image || '/stork-dapp-webpreview.png'
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event - handle notification interactions
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();
  
  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if any Stork SMS window is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // No window open, create new one
        if (clients.openWindow) {
          const urlToOpen = event.notification.data?.url || '/';
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline messages (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendQueuedMessages());
  }
});

// Placeholder for future offline message queue
async function sendQueuedMessages() {
  // TODO: Implement offline message queue
  console.log('Background sync: checking for queued messages');
}