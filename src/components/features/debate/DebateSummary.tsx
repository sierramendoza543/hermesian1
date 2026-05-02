'use client'

interface DebateSummaryProps {
  messages: Array<{
    content: string
    isAI: boolean
    timestamp: string
  }>
  topic: string
  viewpoint: string
}

export default function DebateSummary({ messages, topic, viewpoint }: DebateSummaryProps) {
  const userPoints = messages.filter(m => !m.isAI).length
  const aiPoints = messages.filter(m => m.isAI).length - 1 // Subtract initial greeting
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="font-semibold text-lg mb-2">Debate Summary</h3>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Topic: <span className="font-medium text-gray-900">{topic}</span>
        </p>
        <p className="text-sm text-gray-600">
          Your Position: <span className="font-medium text-gray-900">{viewpoint}</span>
        </p>
        <div className="flex justify-between mt-4">
          <div>
            <p className="text-sm text-gray-600">Your Points</p>
            <p className="font-medium text-lg">{userPoints}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">AI Points</p>
            <p className="font-medium text-lg">{aiPoints}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 