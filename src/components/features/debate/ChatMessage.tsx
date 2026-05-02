'use client'

interface ChatMessageProps {
  content: string
  isAI: boolean
  timestamp: string
}

export default function ChatMessage({ content, isAI, timestamp }: ChatMessageProps) {
  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[70%] rounded-lg p-4 ${
        isAI ? 'bg-gray-100' : 'bg-blue-100'
      }`}>
        <p className="text-gray-800">{content}</p>
        <span className="text-xs text-gray-500 mt-1 block">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  )
} 