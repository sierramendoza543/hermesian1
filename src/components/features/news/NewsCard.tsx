import Image from 'next/image'
import Link from 'next/link'
import { NewsStory } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface NewsCardProps {
  story: NewsStory
  variant?: 'default' | 'featured'
}

export default function NewsCard({ story, variant = 'default' }: NewsCardProps) {
  const imageUrl = story.imageUrl || '/images/placeholder-news.jpg'
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => {
    setImageError(true)
  }

  const finalImageUrl = imageError ? '/images/placeholder-news.jpg' : imageUrl

  if (variant === 'featured') {
    return (
      <div className="relative h-full group">
        <Image
          src={finalImageUrl}
          alt={story.headline}
          fill
          className="object-cover brightness-50 group-hover:brightness-75 transition-all"
          onError={handleImageError}
        />
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <h2 className="text-3xl font-bold mb-3">{story.headline}</h2>
          <p className="text-lg mb-4">{story.description}</p>
          <div className="flex justify-between items-center">
            <Link 
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-blue-200"
            >
              Read Full Story →
            </Link>
            <div className="text-sm">
              {story.source && <span className="mr-2">{story.source}</span>}
              <span>{formatDistanceToNow(new Date(story.date), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full">
      <div className="relative h-48">
        <Image
          src={finalImageUrl}
          alt={story.headline}
          fill
          className="object-cover"
          unoptimized
          onError={handleImageError}
        />
      </div>
      <div className="p-4">
        <h3 className="font-bold text-xl mb-2">{story.headline}</h3>
        <p className="text-gray-600 mb-4">{story.description}</p>
        <div className="flex justify-between items-center">
          <Link 
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Read More →
          </Link>
          <div className="text-sm text-gray-500">
            {story.source && <span className="mr-2">{story.source}</span>}
            <span>{formatDistanceToNow(new Date(story.date), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  )
} 