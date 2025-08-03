// Import Firebase scripts (using compat versions for service worker)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "AIzaSyBaEBkpG2i9p3ePaoQdnE6I5wC4jX8idx0",
  authDomain: "stork-sms-560b2.firebaseapp.com",
  projectId: "stork-sms-560b2",
  storageBucket: "stork-sms-560b2.firebasestorage.app",
  messagingSenderId: "109847041295",
  appId: "1:109847041295:web:3038b5c77c1b123ea69a7a"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get messaging instance
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] Received background message:', payload)
  console.log('🔔 [SW] Payload notification:', payload.notification)
  console.log('🔔 [SW] Payload data:', payload.data)
  
  // Detect if we're on Android for better configuration
  const isAndroid = /Android/i.test(navigator.userAgent)
  
  const notificationTitle = payload.notification?.title || 'Stork SMS'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: isAndroid ? '/stork-app-icon-512x512.png' : '/stork-app-icon-512x512.png', // Use Stork icon for all platforms
    badge: isAndroid ? '/newmonochrome.png' : '/newmonochrome.png', // Updated badge with transparent background
    tag: 'stork-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: payload.data || {},
    // Android-specific optimizations
    ...(isAndroid && {
      image: undefined,
      actions: [],
      timestamp: Date.now(),
      sound: '/noti/11L-stork_squawk_message-1752946389647.mp3'
    })
  }

  console.log('🔔 [SW] Showing notification with title:', notificationTitle)
  console.log('🔔 [SW] Notification options:', notificationOptions)
  
  return self.registration.showNotification(notificationTitle, notificationOptions)
})