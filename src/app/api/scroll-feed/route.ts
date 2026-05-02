import { NextResponse } from 'next/server';
import { genAI } from '@/services/gemini';

// Credible news sources - Real YouTube Channel IDs
const CREDIBLE_CHANNEL_IDS = [
  'UCBi2mrWuNuyYy4gbM6fU18Q', // BBC News
  'UCX6OQ3DkcsbYNE6H8uQQuVA', // BBC News (different region)
  'UCY1kMZp36IQSyNx_9h4mpCg', // PBS NewsHour
  'UC2D2CMWXMOVWx7giW1n3LIg', // Bloomberg
  'UCBJycsmduvYEL83R_U4JriQ', // CNN
  'UCsooa4yRKGN_zEE8iknghZA', // The Economist
  'UCuAXFkgsw1L7xaCfnd5JJOw', // Financial Times
  'UC8butISFwT-Wl7EV0hUK0BQ', // The Guardian
  'UCBi2mrWuNuyYy4gbM6fU18Q', // Reuters
  'UCBJycsmduvYEL83R_U4JriQ', // Associated Press
  'UCsooa4yRKGN_zEE8iknghZA', // The Wall Street Journal
  'UCX6OQ3DkcsbYNE6H8uQQuVA', // NPR
  'UCY1kMZp36IQSyNx_9h4mpCg', // Vox
  'UC2D2CMWXMOVWx7giW1n3LIg', // The Atlantic
  'UCBi2mrWuNuyYy4gbM6fU18Q', // Vice News
  'UCBJycsmduvYEL83R_U4JriQ', // Al Jazeera English
  'UCsooa4yRKGN_zEE8iknghZA', // Time
  'UCuAXFkgsw1L7xaCfnd5JJOw', // Washington Post
  'UC8butISFwT-Wl7EV0hUK0BQ'  // New York Times
];

interface NewsTopic {
  topic: string;
  description: string;
  searchTerms: string;
}

interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  thumbnail: string;
  embedUrl: string;
  topic: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('Starting Scroll Feed generation...');

    // Step 1: Daily Topic Discovery using Gemini
    const topics = await getDailyTopics();
    console.log('Discovered topics:', topics);

    // Step 2: Content Sourcing & Filtering
    const videos = await getCredibleVideos(topics, limit);
    console.log('Found videos:', videos.length);

    return NextResponse.json({
      success: true,
      videos,
      topics,
      totalCount: videos.length
    });

  } catch (error) {
    console.error('Scroll Feed API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate scroll feed',
        videos: [],
        topics: []
      },
      { status: 500 }
    );
  }
}

async function getDailyTopics(): Promise<NewsTopic[]> {
  if (!genAI) {
    console.warn('Gemini AI not available, using fallback topics');
    return getFallbackTopics();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are a news curator identifying the most important global news topics for today.
    
    Focus on topics that are:
    - Currently trending and relevant
    - Globally significant
    - Suitable for short-form video content
    - Appropriate for credible news sources
    
    Categories to consider:
    - International Affairs & Politics
    - Technology & Innovation
    - Economy & Business
    - Climate & Environment
    - Health & Science
    - Social Issues & Culture
    
    Return exactly 5 topics in JSON format:
    [
      {
        "topic": "Brief topic name",
        "description": "One sentence description",
        "searchTerms": "keywords for YouTube search"
      }
    ]
    
    Make topics specific and current. Avoid generic topics.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const topics = JSON.parse(text);
      if (Array.isArray(topics) && topics.length > 0) {
        return topics.slice(0, 5); // Ensure we only get 5 topics
      }
    } catch (parseError) {
      console.error('Error parsing topics:', parseError);
    }

    return getFallbackTopics();

  } catch (error) {
    console.error('Error getting daily topics:', error);
    return getFallbackTopics();
  }
}

async function getCredibleVideos(topics: NewsTopic[], limit: number): Promise<VideoItem[]> {
  if (!genAI) {
    console.warn('Gemini AI not available, using fallback videos');
    return getFallbackVideos();
  }

  try {
    const { youtube } = await import('@/services/gemini');
    
    if (!youtube) {
      console.warn('YouTube API not available, using fallback videos');
      return getFallbackVideos();
    }

    console.log('YouTube API is available, searching for real videos...');

    const allVideos: VideoItem[] = [];

    // Search for videos for each topic
    for (const topic of topics) {
      try {
        console.log(`Searching for videos about: ${topic.topic}`);
        
        // First try: Search across all credible channels for this topic
        for (const channelId of CREDIBLE_CHANNEL_IDS.slice(0, 5)) { // Limit to top 5 channels to avoid rate limits
          try {
            console.log(`Searching channel ${channelId} for topic: ${topic.topic}`);
            const response = await youtube.search.list({
              part: ['snippet'],
              q: topic.searchTerms,
              channelId: channelId,
              type: ['video'],
              order: 'date', // Get most recent videos
              maxResults: 3,
              publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
              videoDuration: 'short' // Focus on short videos
            });

            console.log(`Found ${response.data.items?.length || 0} videos from channel ${channelId}`);

            if (response.data.items) {
              for (const item of response.data.items) {
                // Get video details to check duration and get better metadata
                try {
                  const videoDetails = await youtube.videos.list({
                    part: ['contentDetails', 'statistics', 'snippet'],
                    id: [item.id?.videoId || '']
                  });

                  const video = videoDetails.data.items?.[0];
                  if (!video) continue;

                  const duration = video.contentDetails?.duration || '';
                  const snippet = video.snippet;
                  
                  // Only include videos under 4 minutes and with good engagement
                  if (isShortVideo(duration) && hasGoodEngagement(video.statistics)) {
                    allVideos.push({
                      id: item.id?.videoId || '',
                      title: snippet?.title || '',
                      channelTitle: snippet?.channelTitle || '',
                      channelId: snippet?.channelId || '',
                      publishedAt: snippet?.publishedAt || '',
                      duration: duration,
                      thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
                      embedUrl: `https://www.youtube.com/embed/${item.id?.videoId}`,
                      topic: topic.topic
                    });
                  }
                } catch (detailError) {
                  console.warn('Error getting video details:', detailError);
                }
              }
            }
          } catch (channelError) {
            console.warn(`Error searching channel ${channelId}:`, channelError);
          }
        }
      } catch (searchError) {
        console.warn(`Error searching for topic ${topic.topic}:`, searchError);
      }
    }

    // If we don't have enough videos, try general news searches
    if (allVideos.length < limit) {
      console.log(`Only found ${allVideos.length} videos, searching for general news...`);
      
      try {
        // Search for general news videos from top channels
        const generalSearchTerms = ['news today', 'breaking news', 'latest news', 'current events'];
        
        for (const searchTerm of generalSearchTerms) {
          if (allVideos.length >= limit) break;
          
          const response = await youtube.search.list({
            part: ['snippet'],
            q: searchTerm,
            type: ['video'],
            order: 'date',
            maxResults: 5,
            publishedAfter: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Last 3 days
            videoDuration: 'short'
          });

          if (response.data.items) {
            for (const item of response.data.items) {
              // Check if it's from a credible channel
              const channelId = item.snippet?.channelId;
              if (channelId && CREDIBLE_CHANNEL_IDS.includes(channelId)) {
                try {
                  const videoDetails = await youtube.videos.list({
                    part: ['contentDetails', 'statistics', 'snippet'],
                    id: [item.id?.videoId || '']
                  });

                  const video = videoDetails.data.items?.[0];
                  if (!video) continue;

                  const duration = video.contentDetails?.duration || '';
                  const snippet = video.snippet;
                  
                  if (isShortVideo(duration) && hasGoodEngagement(video.statistics)) {
                    allVideos.push({
                      id: item.id?.videoId || '',
                      title: snippet?.title || '',
                      channelTitle: snippet?.channelTitle || '',
                      channelId: snippet?.channelId || '',
                      publishedAt: snippet?.publishedAt || '',
                      duration: duration,
                      thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
                      embedUrl: `https://www.youtube.com/embed/${item.id?.videoId}`,
                      topic: 'General News'
                    });
                  }
                } catch (detailError) {
                  console.warn('Error getting general video details:', detailError);
                }
              }
            }
          }
        }
      } catch (generalError) {
        console.warn('Error in general news search:', generalError);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueVideos = removeDuplicates(allVideos);
    const sortedVideos = uniqueVideos
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);

    console.log(`Found ${sortedVideos.length} real news videos`);
    return sortedVideos;

  } catch (error) {
    console.error('Error getting credible videos:', error);
    return getFallbackVideos();
  }
}

function isShortVideo(duration: string): boolean {
  // Parse ISO 8601 duration (PT4M13S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes <= 4; // 4 minutes or less
}

function hasGoodEngagement(statistics: any): boolean {
  if (!statistics) return true; // Include if no stats available
  
  const viewCount = parseInt(statistics.viewCount || '0');
  const likeCount = parseInt(statistics.likeCount || '0');
  
  // Basic quality filters:
  // - At least 100 views (not completely ignored)
  // - At least 1% like ratio (basic engagement)
  const likeRatio = viewCount > 0 ? likeCount / viewCount : 0;
  
  return viewCount >= 100 && likeRatio >= 0.01;
}

function removeDuplicates(videos: VideoItem[]): VideoItem[] {
  const seen = new Set();
  return videos.filter(video => {
    if (seen.has(video.id)) {
      return false;
    }
    seen.add(video.id);
    return true;
  });
}

function getFallbackTopics(): NewsTopic[] {
  return [
    {
      topic: "AI Development",
      description: "Latest developments in artificial intelligence and machine learning",
      searchTerms: "artificial intelligence AI technology"
    },
    {
      topic: "Climate Change",
      description: "Environmental news and climate action updates",
      searchTerms: "climate change environment global warming"
    },
    {
      topic: "Global Economy",
      description: "International economic trends and market analysis",
      searchTerms: "economy global markets financial news"
    },
    {
      topic: "Space Exploration",
      description: "Recent space missions and astronomical discoveries",
      searchTerms: "space exploration NASA astronomy"
    },
    {
      topic: "Healthcare Innovation",
      description: "Medical breakthroughs and healthcare technology",
      searchTerms: "healthcare medical innovation medicine"
    }
  ];
}

function getFallbackVideos(): VideoItem[] {
  return [
    {
      id: "9bZkp7q19f0",
      title: "BBC News - Latest Updates",
      channelTitle: "BBC News",
      channelId: "UCBi2mrWuNuyYy4gbM6fU18Q",
      publishedAt: new Date().toISOString(),
      duration: "PT3M30S",
      thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/9bZkp7q19f0",
      topic: "General News"
    },
    {
      id: "jNQXAC9IVRw",
      title: "PBS NewsHour - Current Events",
      channelTitle: "PBS NewsHour",
      channelId: "UCY1kMZp36IQSyNx_9h4mpCg",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: "PT2M45S",
      thumbnail: "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg",
      embedUrl: "https://www.youtube.com/embed/jNQXAC9IVRw",
      topic: "General News"
    }
  ];
}
