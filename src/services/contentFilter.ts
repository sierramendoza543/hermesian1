export interface ContentWarningType {
  type: 'inappropriate' | 'sensitive' | 'complex'
  message: string
}

export function checkContent(text: string): ContentWarningType[] {
  const warnings: ContentWarningType[] = []
  
  // List of sensitive topics
  const sensitiveTopics = [
    'violence',
    'drugs',
    'alcohol',
    'suicide',
    'self-harm',
    'explicit',
    'abuse',
    // Add more as needed
  ]

  // Check for sensitive words
  sensitiveTopics.forEach(topic => {
    if (text.toLowerCase().includes(topic)) {
      warnings.push({
        type: 'sensitive',
        message: `This content contains discussion of ${topic}`
      })
    }
  })

  return warnings
} 