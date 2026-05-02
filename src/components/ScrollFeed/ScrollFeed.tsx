'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, Search, Play, Pause, Volume2, VolumeX, RefreshCw } from 'lucide-react'

interface VideoItem {
  id: string
  title: string
  description: string
  channelTitle: string
  channelId: string
  publishedAt: string
  duration: string
  thumbnail: string
  embedUrl: string
  viewCount: string
  likeCount: string
  topic: string
}

export default function ScrollFeed() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [pausedVideos, setPausedVideos] = useState<Set<number>>(new Set())
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLIFrameElement | null)[]>([])

  // Helper function to format numbers
  const formatNumber = (num: string): string => {
    const number = parseInt(num)
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M'
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K'
    }
    return number.toString()
  }

  // Helper function to format publication date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) {
        return `${diffInDays}d ago`
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    }
  }

  // Fetch videos from API
  const fetchVideos = useCallback(async (append = false) => {
    try {
      if (!append) {
        setLoading(true)
        setError(null)
      }
      
      const response = await fetch('/api/news-feed?limit=10')
      const data = await response.json()
      
      if (data.success && data.videos) {
        if (append) {
          setVideos(prev => [...prev, ...data.videos])
        } else {
          setVideos(data.videos)
          setCurrentIndex(0)
        }
      } else {
        setError(data.error || 'Failed to load videos')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load more videos when approaching the end
  const loadMoreVideos = useCallback(() => {
    if (currentIndex >= videos.length - 3 && !loading) {
      fetchVideos(true)
    }
  }, [currentIndex, videos.length, loading, fetchVideos])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  // Load more videos when approaching the end
  useEffect(() => {
    loadMoreVideos()
  }, [loadMoreVideos])

  // Handle scroll snapping
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollTop = container.scrollTop
    const itemHeight = container.clientHeight
    const newIndex = Math.round(scrollTop / itemHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex)
      
      // Pause all videos except the current one
      videoRefs.current.forEach((videoRef, i) => {
        if (videoRef && i !== newIndex) {
          videoRef.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setPausedVideos(prev => new Set([...prev, i]));
        }
      });
      
      // Resume current video if it was paused
      if (pausedVideos.has(newIndex)) {
        const currentVideoRef = videoRefs.current[newIndex];
        if (currentVideoRef) {
          currentVideoRef.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setPausedVideos(prev => {
            const newSet = new Set(prev);
            newSet.delete(newIndex);
            return newSet;
          });
        }
      }
    }
  }, [currentIndex, videos.length])

  // Programmatic scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current && index >= 0 && index < videos.length) {
      const itemHeight = containerRef.current.clientHeight
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      })
    }
  }, [videos.length])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        if (currentIndex < videos.length - 1) {
          scrollToIndex(currentIndex + 1)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentIndex > 0) {
          scrollToIndex(currentIndex - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, videos.length, scrollToIndex])

  // Handle touch/swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startY = touch.clientY
    const startTime = Date.now()
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const endY = touch.clientY
      const endTime = Date.now()
      const deltaY = startY - endY
      const deltaTime = endTime - startTime
      
      // Swipe detection
      if (Math.abs(deltaY) > 50 && deltaTime < 300) {
        if (deltaY > 0 && currentIndex < videos.length - 1) {
          // Swipe up - next video
          scrollToIndex(currentIndex + 1)
        } else if (deltaY < 0 && currentIndex > 0) {
          // Swipe down - previous video
          scrollToIndex(currentIndex - 1)
        }
      }
      
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchend', handleTouchEnd)
  }, [currentIndex, videos.length, scrollToIndex])

  // Toggle favorite
  const toggleFavorite = useCallback((videoId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(videoId)) {
        newFavorites.delete(videoId)
      } else {
        newFavorites.add(videoId)
      }
      return newFavorites
    })
  }, [])

  // Handle explore story further
  const handleExploreStory = useCallback(() => {
    if (videos[currentIndex]) {
      const video = videos[currentIndex]
      
      // Navigate to explore story page with video details
      const params = new URLSearchParams({
        title: video.title,
        description: video.description
      })
      
      window.location.href = `/explore-story?${params.toString()}`
    }
  }, [currentIndex, videos])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const currentVideoRef = videoRefs.current[currentIndex];
    if (currentVideoRef) {
      if (isPlaying) {
        // Pause current video
        currentVideoRef.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        setPausedVideos(prev => new Set([...prev, currentIndex]));
      } else {
        // Resume current video
        currentVideoRef.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        setPausedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentIndex);
          return newSet;
        });
      }
    }
    setIsPlaying(prev => !prev)
  }, [currentIndex, isPlaying])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading news feed...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => { void fetchVideos(); }}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <p className="mb-4">No videos available</p>
          <button
            onClick={() => { void fetchVideos(); }}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  const currentVideo = videos[currentIndex]

  return (
    <div className="h-screen bg-black overflow-hidden">

      {/* Video Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide pt-16"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className="h-screen w-full snap-start snap-always relative"
          >
            {/* Video Embed */}
                <iframe
                  ref={(el) => { videoRefs.current[index] = el }}
                  src={`${video.embedUrl}?autoplay=${index === currentIndex && isPlaying && !pausedVideos.has(index) ? '1' : '0'}&mute=${isMuted ? '1' : '0'}&loop=1&controls=0&modestbranding=1&rel=0`}
                  className="w-full h-full object-cover"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
            
            {/* Overlay - Only show for current video */}
            {index === currentIndex && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none">
                {/* Bottom Content */}
                <div className="absolute bottom-16 left-0 right-0 p-6 pointer-events-auto">
                  {/* Video Info */}
                  <div className="mb-2">
                    <h2 className="text-white text-lg font-semibold mb-1 line-clamp-1">
                      {video.title}
                    </h2>
                    <p className="text-gray-300 text-sm mb-1">
                      @{video.channelTitle}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>Topic: {video.topic}</span>
                      <span>• {formatDate(video.publishedAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(video.id)}
                      className={`p-3 rounded-full transition-colors ${
                        favorites.has(video.id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart 
                        className={`w-6 h-6 ${
                          favorites.has(video.id) ? 'fill-current' : ''
                        }`} 
                      />
                    </button>

                    {/* Explore Story Button */}
                    <button
                      onClick={handleExploreStory}
                      className="flex-1 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Search className="w-5 h-5" />
                      Explore the Story Further
                    </button>
                  </div>
                </div>

                {/* Navigation Indicator */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="flex flex-col gap-2">
                    {videos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-8 rounded-full transition-colors ${
                          idx === currentIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading indicator for next videos */}
      {currentIndex >= videos.length - 2 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            Loading more videos...
          </div>
        </div>
      )}
    </div>
  )
}
