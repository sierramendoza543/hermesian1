'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Message {
  content: string
  isAI: boolean
  timestamp: string
  score?: number
}

interface DebateFlowProps {
  messages: Message[]
  topic: string
}

export default function DebateFlow({ messages, topic }: DebateFlowProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || messages.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth
    const height = 200
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, messages.length - 1])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([height - margin.bottom, margin.top])

    // Create the flow line
    const line = d3.line<Message>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d.score || 0.5))
      .curve(d3.curveMonotoneX)

    // Draw the flow line
    svg.append('path')
      .datum(messages)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line)

    // Add points
    svg.selectAll('circle')
      .data(messages)
      .enter()
      .append('circle')
      .attr('cx', (_, i) => xScale(i))
      .attr('cy', d => yScale(d.score || 0.5))
      .attr('r', 4)
      .attr('fill', d => d.isAI ? '#3b82f6' : '#ef4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .append('title')
      .text((d: Message) => d.content.slice(0, 50) + '...')

  }, [messages])

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Debate Flow</h3>
      <svg
        ref={svgRef}
        className="w-full h-[200px] bg-white rounded-lg"
      />
      <div className="flex justify-center space-x-4 text-xs text-gray-500 mt-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#3b82f6] rounded-full mr-1" />
          <span>AI</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#ef4444] rounded-full mr-1" />
          <span>You</span>
        </div>
      </div>
    </div>
  )
} 