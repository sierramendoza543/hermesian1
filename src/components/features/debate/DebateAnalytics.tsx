'use client'

import { useEffect, useState } from 'react'
import { SentimentAnalyzer, KeyPointsExtractor } from '@/lib/ml/models'
import { DebateScorer } from '@/lib/ml/scoring'
import DebateFlow from './DebateFlow'

interface DebateAnalyticsProps {
  messages: Array<{
    content: string
    isAI: boolean
    timestamp: string
  }>
  topic: string
}

interface ArgumentStructure {
  claims: string[]
  evidence: string[]
  counterArguments: string[]
  conclusions: string[]
}

interface Point {
  content: string
  type: string
}

export default function DebateAnalytics({ messages, topic }: DebateAnalyticsProps) {
  const [sentiment, setSentiment] = useState<number>(0.5)
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [argumentStructure, setArgumentStructure] = useState<ArgumentStructure>({
    claims: [],
    evidence: [],
    counterArguments: [],
    conclusions: []
  })
  const [scores, setScores] = useState<number[]>([])
  const [analyzer] = useState(() => new SentimentAnalyzer())
  const [extractor] = useState(() => new KeyPointsExtractor())
  const [scorer] = useState(() => new DebateScorer())

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    // Update sentiment
    analyzer.analyzeSentiment(lastMessage.content)
      .then(score => {
        setSentiment(prev => (prev * 0.7) + (score.sentiment * 0.3))
      })
      .catch(console.error)

    // Score all messages
    const newScores = messages.map(msg => scorer.scorePoint(msg, topic))
    setScores(newScores)

    // Extract key points and argument structure
    const recentMessages = messages.slice(-3)
    const analysis = recentMessages
      .map(msg => extractor.extractKeyPoints(msg.content, topic))
      .reduce((acc, curr) => ({
        keyPoints: [...acc.keyPoints, ...curr.keyPoints].slice(0, 3),
        argumentStructure: {
          claims: [...acc.argumentStructure.claims, ...curr.argumentStructure.claims],
          evidence: [...acc.argumentStructure.evidence, ...curr.argumentStructure.evidence],
          counterArguments: [...acc.argumentStructure.counterArguments, ...curr.argumentStructure.counterArguments],
          conclusions: [...acc.argumentStructure.conclusions, ...curr.argumentStructure.conclusions]
        }
      }), {
        keyPoints: [] as string[],
        argumentStructure: {
          claims: [],
          evidence: [],
          counterArguments: [],
          conclusions: []
        }
      })

    setKeyPoints(analysis.keyPoints)
    setArgumentStructure(analysis.argumentStructure)
  }, [messages, topic])

  const messagesWithScores = messages.map((msg, i) => ({
    ...msg,
    score: scores[i]
  }))

  return (
    <div className="p-4 space-y-6">
      <DebateFlow messages={messagesWithScores} topic={topic} />

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Debate Tone</h3>
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${sentiment * 100}%`,
              backgroundColor: `hsl(${sentiment * 120}, 70%, 50%)`
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Negative</span>
          <span>Positive</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Key Points</h3>
        <ul className="space-y-2">
          {keyPoints.map((point: string, i: number) => (
            <li 
              key={i}
              className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Argument Structure</h3>
        {Object.entries(argumentStructure).map(([type, points]) => (
          <div key={type} className="mt-2">
            <h4 className="text-xs font-medium text-gray-600 capitalize">
              {type.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <ul className="space-y-1 mt-1">
              {points.slice(0, 2).map((point: string, i: number) => (
                <li 
                  key={i}
                  className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Debate Score</h3>
        <div className="text-2xl font-bold text-blue-600">
          {scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0}
        </div>
        <p className="text-xs text-gray-500">Based on argument quality and relevance</p>
      </div>
    </div>
  )
} 