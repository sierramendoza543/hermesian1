import * as tf from '@tensorflow/tfjs'

type Emotion = 'joy' | 'anger' | 'sadness' | 'fear' | 'neutral'

// Enhanced sentiment analyzer with emotion detection
export class SentimentAnalyzer {
  private model: tf.LayersModel | null = null
  private readonly vocabSize = 10000
  private readonly maxLength = 150
  private readonly emotions: Emotion[] = ['joy', 'anger', 'sadness', 'fear', 'neutral']

  // Emotion-specific word lists (simplified version)
  private readonly emotionLexicon: Record<Emotion, string[]> = {
    joy: ['happy', 'great', 'excellent', 'good', 'wonderful', 'fantastic'],
    anger: ['angry', 'furious', 'outraged', 'annoyed', 'frustrated'],
    sadness: ['sad', 'disappointed', 'unfortunate', 'regret', 'sorry'],
    fear: ['worried', 'concerned', 'afraid', 'scared', 'anxious'],
    neutral: ['think', 'believe', 'consider', 'observe', 'note']
  }

  async loadModel(): Promise<void> {
    // Simple sequential model for sentiment
    this.model = tf.sequential({
      layers: [
        tf.layers.embedding({ inputDim: this.vocabSize, outputDim: 32, inputLength: this.maxLength }),
        tf.layers.globalAveragePooling1d({}),
        tf.layers.dense({ units: 24, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    })

    await this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: number
    emotions: Record<Emotion, number>
  }> {
    if (!this.model) await this.loadModel()
    
    const words = text.toLowerCase().split(/\s+/)
    const emotionScores = this.analyzeEmotions(words)
    const sentiment = await this.analyzeSentimentScore(text)

    return {
      sentiment,
      emotions: emotionScores
    }
  }

  private analyzeEmotions(words: string[]): Record<Emotion, number> {
    const scores: Record<Emotion, number> = {} as Record<Emotion, number>
    
    this.emotions.forEach(emotion => {
      const emotionWords = this.emotionLexicon[emotion]
      const matches = words.filter(word => emotionWords.includes(word)).length
      scores[emotion] = matches / words.length
    })

    return scores
  }

  private async analyzeSentimentScore(text: string): Promise<number> {
    if (!this.model) await this.loadModel()
    
    // Simple tokenization and encoding
    const encoded = this.encodeText(text)
    const tensor = tf.tensor2d([encoded], [1, this.maxLength])
    
    try {
      const prediction = await this.model!.predict(tensor) as tf.Tensor
      const sentiment = await prediction.data()
      return sentiment[0] // Returns value between 0 and 1
    } finally {
      tensor.dispose()
    }
  }

  private encodeText(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/)
    const encoded = new Array(this.maxLength).fill(0)
    
    words.forEach((word, i) => {
      if (i < this.maxLength) {
        encoded[i] = Math.abs(this.hashCode(word) % this.vocabSize)
      }
    })
    
    return encoded
  }

  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash
    }
    return hash
  }

  private getArgumentType(sentence: string): string | null {
    // Implementation of argument type detection
    return null
  }

  private determineArgumentType(sentence: string, structure: {
    claims: string[]
    evidence: string[]
    counterArguments: string[]
    conclusions: string[]
  }): void {
    const type = this.getArgumentType(sentence)
    if (type && type in structure) {
      (structure as any)[type].push(sentence)
    }
  }
}

// Enhanced key points extractor
export class KeyPointsExtractor {
  private readonly stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'hello',
    'hi', 'hey', 'im', "i'm", 'iam', 'ready', 'what', 'whats', "what's"
  ])

  private readonly importantPhrases = [
    'because', 'therefore', 'however', 'moreover', 'furthermore',
    'consequently', 'notably', 'importantly', 'specifically',
    'research shows', 'studies indicate', 'evidence suggests',
    'according to', 'in conclusion', 'this demonstrates'
  ]

  private readonly argumentMarkers = {
    claim: ['argue', 'claim', 'believe', 'think', 'suggest'],
    evidence: ['because', 'since', 'research', 'studies', 'data', 'statistics'],
    counterArgument: ['however', 'although', 'despite', 'nevertheless', 'conversely'],
    conclusion: ['therefore', 'thus', 'consequently', 'in conclusion', 'ultimately']
  }
  private readonly argumentTypeMap = {
    claim: 'claims',
    evidence: 'evidence',
    counterArgument: 'counterArguments',
    conclusion: 'conclusions'
  } as const

  private readonly topicRelevanceBooster = 2.0
  private readonly coherenceBooster = 1.5

  extractKeyPoints(text: string, topic: string): {
    keyPoints: string[]
    argumentStructure: {
      claims: string[]
      evidence: string[]
      counterArguments: string[]
      conclusions: string[]
    }
  } {
    const sentences = this.preprocessText(text)
    const scoredSentences = this.scoreSentences(sentences, topic)
    
    // Categorize sentences by argument type
    const structure = {
      claims: [] as string[],
      evidence: [] as string[],
      counterArguments: [] as string[],
      conclusions: [] as string[]
    }

    scoredSentences.forEach(({ sentence, type }) => {
      if (type) {
        const targetKey = this.argumentTypeMap[type]
        structure[targetKey].push(sentence)
      }
    })

    return {
      keyPoints: scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(s => s.sentence),
      argumentStructure: structure
    }
  }

  private preprocessText(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && !this.isGreeting(s))
  }

  private scoreSentences(sentences: string[], topic: string) {
    return sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/)
      const scores = {
        relevance: this.scoreTopicRelevance(words, topic) * this.topicRelevanceBooster,
        complexity: this.getSentenceComplexity(sentence),
        coherence: this.scoreCoherence(sentence) * this.coherenceBooster,
        argumentStrength: this.scoreArgumentStrength(sentence)
      }

      const type = this.determineArgumentType(sentence)
      
      return {
        sentence,
        score: Object.values(scores).reduce((a, b) => a + b, 0) / 4,
        type
      }
    })
  }

  private determineArgumentType(sentence: string): keyof typeof this.argumentMarkers | null {
    const lowerSentence = sentence.toLowerCase()
    
    for (const [type, markers] of Object.entries(this.argumentMarkers)) {
      if (markers.some(marker => lowerSentence.includes(marker))) {
        return type as keyof typeof this.argumentMarkers
      }
    }
    
    return null
  }

  private scoreCoherence(sentence: string): number {
    // Measure sentence coherence through connective words and phrase structure
    const hasConnectives = /and|but|or|nor|for|so|yet|although|unless|while/i.test(sentence)
    const hasProperStructure = /^[A-Z].*[.!?]$/.test(sentence)
    
    return (hasConnectives ? 0.5 : 0) + (hasProperStructure ? 0.5 : 0)
  }

  private getSentenceComplexity(sentence: string): number {
    const words = sentence.split(/\s+/)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    return Math.min(avgWordLength / 10, 1) // Normalize to 0-1
  }

  private scoreTopicRelevance(words: string[], topic: string): number {
    // Implementation of topic relevance scoring logic
    return 0.5 // Placeholder, actual implementation needed
  }

  private scoreArgumentStrength(sentence: string): number {
    // Implementation of argument strength scoring logic
    return 0.5 // Placeholder, actual implementation needed
  }

  private isGreeting(sentence: string): boolean {
    const lowerSentence = sentence.toLowerCase()
    return lowerSentence.includes('hello') || lowerSentence.includes('ready to debate') ||
           lowerSentence.includes('first argument')
  }
} 