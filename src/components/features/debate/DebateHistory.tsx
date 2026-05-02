'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { formatDistanceToNow } from 'date-fns'

interface SimpleDebate {
  id: string
  topic: string
  viewpoint: string
  updatedAt: Date
  messageCount: number
}

export default function DebateHistory() {
  const [debates, setDebates] = useState<SimpleDebate[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function loadDebates() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const debatesRef = collection(db, 'debates')
        const q = query(
          debatesRef,
          where('userId', '==', user.uid),
          orderBy('updatedAt', 'desc')
        )

        const snapshot = await getDocs(q)
        const debatesList = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            topic: data.topic,
            viewpoint: data.viewpoint,
            updatedAt: data.updatedAt.toDate(),
            messageCount: data.messages?.length || 0
          }
        })

        setDebates(debatesList)
      } catch (error) {
        console.error('Error loading debates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDebates()
  }, [user])

  const handleDelete = async (debateId: string) => {
    if (!confirm('Are you sure you want to delete this debate?')) return

    try {
      await fetch(`/api/debates/${debateId}`, { method: 'DELETE' })
      setDebates(debates.filter(d => d.id !== debateId))
    } catch (error) {
      console.error('Error deleting debate:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Your Debate History</h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (debates.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Your Debate History</h2>
        <p className="text-gray-500 text-center py-4">No debates yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Your Debate History</h2>
      <div className="space-y-4">
        {debates.map((debate) => (
          <div 
            key={debate.id} 
            className="border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{debate.topic}</h3>
                <p className="text-sm text-gray-500">
                  {debate.viewpoint} • {debate.messageCount} messages
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDelete(debate.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => router.push(`/debates/${debate.id}`)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Resume
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {formatDistanceToNow(debate.updatedAt, { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 