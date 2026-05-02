interface DebatePoint {
  content: string
  isAI: boolean
  timestamp: string
}

export class DebateScorer {
  // Scoring criteria weights
  private weights = {
    length: 0.2,        // Length of argument
    complexity: 0.3,    // Vocabulary complexity
    structure: 0.3,     // Sentence structure
    relevance: 0.2      // Topic relevance
  }

  // Score a single debate point
  scorePoint(point: DebatePoint, topic: string): number {
    const scores = {
      length: this.scoreLengthAndStructure(point.content),
      complexity: this.scoreComplexity(point.content),
      structure: this.scoreArgumentStructure(point.content),
      relevance: this.scoreRelevance(point.content, topic)
    }

    return Object.entries(scores).reduce((total, [key, score]) => {
      return total + score * this.weights[key as keyof typeof this.weights]
    }, 0)
  }

  private scoreLengthAndStructure(text: string): number {
    const words = text.split(/\s+/).length
    // Ideal length is between 20 and 100 words
    return Math.min(words / 100, 1) * (words > 20 ? 1 : words / 20)
  }

  private scoreComplexity(text: string): number {
    const words = text.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words).size
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    
    // Score based on vocabulary diversity and word length
    return Math.min((uniqueWords / words.length) * (avgWordLength / 5), 1)
  }

  private scoreArgumentStructure(text: string): number {
    // Look for argument indicators
    const hasConclusion = /therefore|thus|hence|consequently|in conclusion/i.test(text)
    const hasReasoning = /because|since|as|due to|given that/i.test(text)
    const hasEvidence = /research|study|evidence|data|statistics|according to/i.test(text)
    
    let score = 0
    if (hasConclusion) score += 0.4
    if (hasReasoning) score += 0.3
    if (hasEvidence) score += 0.3
    
    return score
  }

  private scoreRelevance(text: string, topic: string): number {
    const topicWords = new Set(topic.toLowerCase().split(/\s+/))
    const words = text.toLowerCase().split(/\s+/)
    
    // Count topic-related words
    const relevantWords = words.filter(word => topicWords.has(word))
    return Math.min(relevantWords.length / (topicWords.size * 0.5), 1)
  }
} 