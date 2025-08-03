import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyBaEBkpG2i9p3ePaoQdnE6I5wC4jX8idx0",
  authDomain: "stork-sms-560b2.firebaseapp.com",
  projectId: "stork-sms-560b2",
  storageBucket: "stork-sms-560b2.firebasestorage.app",
  messagingSenderId: "109847041295",
  appId: "1:109847041295:web:3038b5c77c1b123ea69a7a",
  measurementId: "G-6DDBD9NK4X"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app)
}

export { messaging, getToken, onMessage }
export default app