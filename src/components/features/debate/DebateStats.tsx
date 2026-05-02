'use client'

import { useEffect, useState } from 'react'

interface DebateStatsProps {
  startTime: string
  messageCount: number
}

export default function DebateStats({ startTime, messageCount }: DebateStatsProps) {
  const [duration, setDuration] = useState('00:00')

  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(startTime).getTime()
      const now = new Date().getTime()
      const diff = now - start
      
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      
      setDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  return (
    <div className="flex items-center space-x-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center">
        <span className="text-sm text-gray-500">Duration:</span>
        <span className="ml-2 font-mono text-sm">{duration}</span>
      </div>
      <div className="flex items-center">
        <span className="text-sm text-gray-500">Turns:</span>
        <span className="ml-2 font-mono text-sm">{Math.floor(messageCount / 2)}</span>
      </div>
    </div>
  )
} 