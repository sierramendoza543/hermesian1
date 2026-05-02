export interface NewsStory {
  id: string
  headline: string
  description: string
  imageUrl: string
  date: string
  url: string
  source?: string
}

export interface Debate {
  id: string
  topic: string
  status: 'active' | 'completed'
  viewpoint: 'for' | 'against' | 'neutral'
  createdAt: string
}

export interface TopHeadline {
  headline: string
  description: string
  searchTerms: string
}

export interface Article {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  url?: string;
  imageURL: string;
  category: string;
} 