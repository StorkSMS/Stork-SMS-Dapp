// Import and configure Firebase using modern SDK
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js')

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
  console.log('Received background message:', payload)
  
  // Detect if we're on Android for better configuration
  const isAndroid = /Android/i.test(navigator.userAgent)
  
  const notificationTitle = payload.notification?.title || 'Stork SMS'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: isAndroid ? '/monochrome-app-icon.png' : '/stork-app-icon-512x512.png',
    badge: '/monochrome-app-icon.png',
    tag: 'stork-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: payload.data || {},
    // Android-specific optimizations
    ...(isAndroid && {
      image: undefined,
      actions: [],
      timestamp: Date.now()
    })
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})