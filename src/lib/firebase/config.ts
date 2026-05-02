import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

const configValues = Object.values(firebaseConfig)
const hasFirebaseConfig = configValues.every(
  (value) => typeof value === 'string' && value.trim().length > 0 && !value.includes('your_')
)

// Initialize Firebase
const app = hasFirebaseConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null
const auth = typeof window !== 'undefined' && app ? getAuth(app) : null
const db = app ? getFirestore(app) : null

// Set persistence only in browser runtime
if (auth) {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error('Auth persistence error:', error)
    })
}

export { app, auth, db } 