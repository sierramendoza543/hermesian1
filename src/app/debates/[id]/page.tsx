'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebate } from '@/contexts/DebateContext'
import ChatMessage from '@/components/features/debate/ChatMessage'
import FactCheckSidebar from '@/components/features/debate/FactCheckSidebar'
import { checkContent, ContentWarningType } from '@/services/contentFilter'
import ContentWarning from '@/components/features/debate/ContentWarning'
import AuthWarningBanner from '@/components/features/debate/AuthWarningBanner'
import DebateStats from '@/components/features/debate/DebateStats'
import TypingIndicator from '@/components/features/debate/TypingIndicator'
import DebateAnalytics from '@/components/features/debate/DebateAnalytics'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Temporary mock data
const MOCK_FACTS = [
  {
    claim: "AI can predict weather patterns with 90% accuracy",
    verdict: 'partial' as const,
    source: 'https://example.com/source1'
  },
  {
    claim: "Machine learning models require massive amounts of data",
    verdict: 'true' as const,
    source: 'https://example.com/source2'
  }
]

const RESPONSE_LENGTHS = {
  concise: 100,
  moderate: 200,
  detailed: 400
} as const

type ResponseLength = keyof typeof RESPONSE_LENGTHS

interface Message {
  content: string
  isAI: boolean
  timestamp: string
}

export default function DebateChatPage({ params }: { params: { id: string } }) {
  const { 
    topic, 
    viewpoint, 
    currentDebateId, 
    endSession, 
    deleteCurrentSession, 
    restartSession, 
    saveSession,
    loadDebate
  } = useDebate()
  const { user } = useAuth()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [contentWarnings, setContentWarnings] = useState<ContentWarningType[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [startTime] = useState(new Date().toISOString())
  const [responseLength, setResponseLength] = useState<ResponseLength>('moderate')

  useEffect(() => {
    // Initialize with welcome message
    setMessages([{
      content: "Hello! I'm ready to debate. What's your first argument?",
      isAI: true,
      timestamp: new Date().toISOString()
    }])
  }, [])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    // Add user message
    const userMessage = {
      content: message,
      isAI: false,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsTyping(true)

    try {
      // Convert messages to API format
      const apiMessages = messages.concat(userMessage).map(msg => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.content
      }))

      // Get AI response
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          topic,
          viewpoint
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      
      // Add AI response
      setMessages(prev => [...prev, {
        content: data.response || "I apologize, but I couldn't generate a response. Let's continue the debate.",
        isAI: true,
        timestamp: new Date().toISOString()
      }])

    } catch (error) {
      console.error('Error:', error)
      // Add error message
      setMessages(prev => [...prev, {
        content: "I apologize, but I encountered an error. Please try again.",
        isAI: true,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      })
    }
  }, [messages])

  useEffect(() => {
    if (messages.length > 1) {
      saveSession(messages)
    }
  }, [messages])

  const handleProceedWithWarning = () => {
    if (contentWarnings.length > 0) {
      setContentWarnings([])
      handleSendMessage()
    }
  }

  const handleCancelWarning = () => {
    setContentWarnings([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Add session management handlers
  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this debate session?')) {
      await endSession()
      router.push('/debates')
    }
  }

  const handleDeleteSession = async () => {
    if (confirm('Are you sure you want to delete this debate session? This cannot be undone.')) {
      await deleteCurrentSession()
      router.push('/debates')
    }
  }

  const handleRestartSession = () => {
    if (confirm('Are you sure you want to restart this debate with the same topic?')) {
      restartSession()
      setMessages([{
        content: "Hello! I'm ready to debate. What's your first argument?",
        isAI: true,
        timestamp: new Date().toISOString()
      }])
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-none">
        <AuthWarningBanner />
        <DebateStats 
          startTime={startTime}
          messageCount={messages.length}
        />
        {/* Session Controls */}
        <div className="flex items-center justify-end space-x-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
          <button
            onClick={handleRestartSession}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            Restart
          </button>
          <button
            onClick={handleEndSession}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            End Session
          </button>
          <button
            onClick={handleDeleteSession}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <ChatMessage key={i} {...msg} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-px" />
          </div>

          {/* Input Area */}
          <div className="flex-none border-t border-gray-200 p-4 bg-white">
            <div className="flex space-x-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type your message... (Shift + Enter for new line)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={isTyping || !message.trim()}
                className="px-6 py-2 h-fit bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Fact-Check Sidebar */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="border-b border-gray-200">
            <FactCheckSidebar facts={MOCK_FACTS} />
          </div>
          <DebateAnalytics messages={messages} topic={topic} />
        </div>
      </div>

      <ContentWarning
        warnings={contentWarnings}
        onProceed={handleProceedWithWarning}
        onCancel={handleCancelWarning}
      />
    </div>
  )
} 