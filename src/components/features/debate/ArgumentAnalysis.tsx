'use client'

interface ArgumentAnalysisProps {
  argumentStructure: {
    claims: string[]
    evidence: string[]
    counterArguments: string[]
    conclusions: string[]
  }
}

export default function ArgumentAnalysis({ argumentStructure }: ArgumentAnalysisProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Argument Structure</h3>
      
      {Object.entries(argumentStructure).map(([type, points]) => (
        <div key={type} className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 capitalize">
            {type.replace(/([A-Z])/g, ' $1').trim()}
          </h4>
          <ul className="space-y-1">
            {points.map((point, i) => (
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
  )
} 