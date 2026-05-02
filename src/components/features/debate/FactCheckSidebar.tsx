'use client'

interface Fact {
  claim: string
  verdict: 'true' | 'false' | 'partial'
  source: string
}

interface FactCheckSidebarProps {
  facts: Fact[]
}

export default function FactCheckSidebar({ facts }: FactCheckSidebarProps) {
  return (
    <div className="w-80 bg-gray-50 p-4 border-l border-gray-200">
      <h3 className="font-bold text-lg mb-4">Fact Checking</h3>
      <div className="space-y-4">
        {facts.map((fact, index) => (
          <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
            <p className="text-sm mb-2">{fact.claim}</p>
            <div className={`text-sm font-medium ${
              fact.verdict === 'true' ? 'text-green-600' :
              fact.verdict === 'false' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {fact.verdict.charAt(0).toUpperCase() + fact.verdict.slice(1)}
            </div>
            <a 
              href={fact.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              Source →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
} 