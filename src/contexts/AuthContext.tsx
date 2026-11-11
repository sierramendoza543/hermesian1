'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onIdTokenChanged,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '@/lib/firebase/config'
import { ensureUserProfile } from '@/lib/firebase/userData'

interface AuthContextType {
  user: User | null
  loading: boolean
  /** False when Firebase env vars are missing (accounts disabled, app still works). */
  authAvailable: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address doesn\'t look right.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with that email already exists. Try signing in instead.'
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute and try again.'
    case 'auth/network-request-failed':
      return 'Network problem - check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project yet (Firebase console → Authentication → Sign-in method).'
    default:
      return error instanceof Error && error.message.startsWith('Accounts') ? error.message : 'Something went wrong. Please try again.'
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [, setTick] = useState(0) // forces consumers to re-render after in-place profile updates
  const authAvailable = firebaseConfigured

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onIdTokenChanged(auth, async (next) => {
      setUser(next)

      if (next) {
        try {
          const token = await next.getIdToken()
          // Only the proxy's presence/expiry check reads this cookie
          const secure = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${secure}`
          ensureUserProfile(next).catch(() => {})
        } catch (error) {
          console.error('Error getting auth token:', error)
        }
      } else {
        document.cookie = '__session=; path=/; max-age=0; SameSite=Lax'
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const requireAuth = () => {
    if (!auth) throw new Error('Accounts are not configured on this deployment.')
    return auth
  }

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(requireAuth(), email.trim(), password)
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    const a = requireAuth()
    const cred = await createUserWithEmailAndPassword(a, email.trim(), password)
    if (displayName?.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() })
      setTick((t) => t + 1)
    }
    await ensureUserProfile(cred.user, displayName?.trim()).catch(() => {})
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(requireAuth(), email.trim())
  }

  const updateDisplayName = async (name: string) => {
    const a = requireAuth()
    if (!a.currentUser) throw new Error('Accounts: not signed in')
    await updateProfile(a.currentUser, { displayName: name.trim() })
    setTick((t) => t + 1)
  }

  const logout = async () => {
    await signOut(requireAuth())
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, authAvailable, signIn, signUp, resetPassword, updateDisplayName, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
