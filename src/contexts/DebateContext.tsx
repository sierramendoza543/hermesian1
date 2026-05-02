'use client'

import { createContext, useContext, useState } from 'react'
import { saveDebateSession, updateDebateSession, deleteDebateSession, getDebateSession } from '@/lib/firebase/debates'
import { useAuth } from '@/contexts/AuthContext'

interface DebateContextType {
  topic: string
  setTopic: (topic: string) => void
  viewpoint: 'for' | 'against' | 'neutral'
  setViewpoint: (viewpoint: 'for' | 'against' | 'neutral') => void
  currentDebateId: string | null
  saveSession: (messages: any[]) => Promise<void>
  endSession: () => Promise<void>
  deleteCurrentSession: () => Promise<void>
  restartSession: () => void
  loadDebate: (debateId: string) => Promise<boolean>
  isLoading: boolean
}

const DebateContext = createContext<DebateContextType | undefined>(undefined)

export function DebateProvider({ children }: { children: React.ReactNode }) {
  const [topic, setTopic] = useState('')
  const [viewpoint, setViewpoint] = useState<'for' | 'against' | 'neutral'>('neutral')
  const { user } = useAuth()
  const [currentDebateId, setCurrentDebateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const saveSession = async (messages: any[]) => {
    if (!user) return

    try {
      if (currentDebateId) {
        await updateDebateSession(currentDebateId, messages)
      } else {
        const debateId = await saveDebateSession(user.uid, topic, viewpoint, messages)
        setCurrentDebateId(debateId)
      }
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  const endSession = async () => {
    if (!currentDebateId) return
    try {
      await updateDebateSession(currentDebateId, [], 'completed')
      setCurrentDebateId(null)
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  const deleteCurrentSession = async () => {
    if (!currentDebateId) return
    try {
      await deleteDebateSession(currentDebateId)
      setCurrentDebateId(null)
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const restartSession = () => {
    setCurrentDebateId(null)
  }

  const loadDebate = async (debateId: string) => {
    if (!user) return false

    try {
      setIsLoading(true)
      const debate = await getDebateSession(debateId)
      
      if (debate && debate.userId === user.uid) {
        setTopic(debate.topic)
        setViewpoint(debate.viewpoint as 'for' | 'against' | 'neutral')
        setCurrentDebateId(debateId)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error loading debate:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DebateContext.Provider value={{ 
      topic, 
      setTopic, 
      viewpoint, 
      setViewpoint,
      currentDebateId,
      saveSession,
      endSession,
      deleteCurrentSession,
      restartSession,
      loadDebate,
      isLoading
    }}>
      {children}
    </DebateContext.Provider>
  )
}

export function useDebate() {
  const context = useContext(DebateContext)
  if (context === undefined) {
    throw new Error('useDebate must be used within a DebateProvider')
  }
  return context
} 