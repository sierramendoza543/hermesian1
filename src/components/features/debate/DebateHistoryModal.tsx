'use client'

import { useState } from 'react'
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

export default function DebateHistoryModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const [debates, setDebates] = useState<SimpleDebate[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  // Only load debates when modal is opened
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

  // Load debates when modal opens
  if (isOpen && loading) {
    loadDebates()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Debate History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : debates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No debates yet</p>
          ) : (
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
                        onClick={async () => {
                          await fetch(`/api/debates/${debate.id}`, { method: 'DELETE' })
                          setDebates(debates.filter(d => d.id !== debate.id))
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/debates/${debate.id}`)
                          onClose()
                        }}
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
          )}
        </div>
      </div>
    </div>
  )
} 