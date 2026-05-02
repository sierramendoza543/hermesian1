'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function DebatesPage() {
  const [topicInput, setTopicInput] = useState('')
  const [selectedViewpoint, setSelectedViewpoint] = useState<'for' | 'against' | 'neutral'>('neutral')
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [debateId, setDebateId] = useState<string | null>(null)

  const handleStartDebate = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('1. Starting debate creation...')
    
    if (!topicInput.trim()) {
      setError('Please enter a topic')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Generate a simple ID
      const newDebateId = Math.random().toString(36).substr(2, 9)
      console.log('2. Created debate ID:', newDebateId)
      setDebateId(newDebateId)
      
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to create debate. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // If we have a debate ID, show the link
  if (debateId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Debate Created!</h2>
          <p className="mb-4">Click below to start your debate:</p>
          <Link 
            href={`/debates/${debateId}`}
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Start Debate
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {!user && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Note: Your debate session will not be saved unless you are logged in.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Start a Debate</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleStartDebate}>
            {/* Topic Selection */}
            <div className="mb-6">
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Choose a Topic
              </label>
              <input
                type="text"
                id="topic"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter a topic for debate"
                required
              />
            </div>

            {/* Viewpoint Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Viewpoint
              </label>
              <div className="flex space-x-4">
                {(['for', 'against', 'neutral'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedViewpoint(option)}
                    className={`px-4 py-2 rounded-md ${
                      selectedViewpoint === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Starting...
                </>
              ) : (
                'Start Debate'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 