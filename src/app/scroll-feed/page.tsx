import type { Metadata } from 'next'
import ScrollFeed from '@/components/ScrollFeed/ScrollFeed'

export const metadata: Metadata = { title: 'News videos' }

export default function ScrollFeedPage() {
  return (
    <div className="h-[calc(100dvh-4rem)] bg-charcoal">
      <ScrollFeed />
    </div>
  )
}
