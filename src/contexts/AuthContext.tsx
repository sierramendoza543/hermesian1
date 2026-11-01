'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  getIdToken
} from 'firebase/auth'
import { auth } from '@/lib/firebase/config'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth is not configured; auth features are disabled.')
      setLoading(false)
      return () => {}
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          const token = await user.getIdToken()
          // Only the middleware's presence/expiry check reads this cookie
          const secure = window.location.protocol === 'https:' ? '; Secure' : ''
          document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${secure}`
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

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth is not configured')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth is not configured')
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const logout = async () => {
    if (!auth) throw new Error('Firebase auth is not configured')
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {!loading && children}
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