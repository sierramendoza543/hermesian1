'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AppContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
  favorites: Set<string>
  setFavorites: (favorites: Set<string>) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState('scroll-feed')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('scrollFeedFavorites')
    if (storedFavorites) {
      try {
        const favoritesArray = JSON.parse(storedFavorites)
        setFavorites(new Set(favoritesArray))
      } catch (error) {
        console.error('Error parsing favorites:', error)
      }
    }
  }, [])

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('scrollFeedFavorites', JSON.stringify(Array.from(favorites)))
  }, [favorites])

  const value = {
    activeTab,
    setActiveTab,
    favorites,
    setFavorites
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
