import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { google } from 'googleapis';

// Your Google API Key - Replace with your actual key
const GOOGLE_API_KEY = 'AIzaSyC9Rfj-zz7bdLwfa00f9gmIdUqnG-gIxWs';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: GOOGLE_API_KEY
});

// Credible news sources - Real YouTube Channel IDs
const CREDIBLE_CHANNEL_IDS = [
  'UCBi2mrWuNuyYy4gbM6fU18Q', // BBC News
  'UCY1kMZp36IQSyNx_9h4mpCg', // PBS NewsHour
  'UC2D2CMWXMOVWx7giW1n3LIg', // Bloomberg
  'UCBJycsmduvYEL83R_U4JriQ', // CNN
  'UCsooa4yRKGN_zEE8iknghZA', // The Economist
  'UCuAXFkgsw1L7xaCfnd5JJOw', // Financial Times
  'UC8butISFwT-Wl7EV0hUK0BQ', // The Guardian
  'UCX6OQ3DkcsbYNE6H8uQQuVA', // NPR
  'UCY1kMZp36IQSyNx_9h4mpCg', // Vox
  'UC2D2CMWXMOVWx7giW1n3LIg'  // The Atlantic
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

    console.log('Starting Scroll Feed generation with real YouTube API...');

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
        return topics.slice(0, 5);
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
  console.log('YouTube API is available, searching for real videos...');
  const allVideos: VideoItem[] = [];

  // Search for videos for each topic
  for (const topic of topics) {
    try {
      console.log(`Searching for videos about: ${topic.topic}`);
      
      // Search across credible channels for this topic
      for (const channelId of CREDIBLE_CHANNEL_IDS.slice(0, 5)) {
        try {
          console.log(`Searching channel ${channelId} for topic: ${topic.topic}`);
          const response = await youtube.search.list({
            part: ['snippet'],
            q: topic.searchTerms,
            channelId: channelId,
            type: ['video'],
            order: 'date',
            maxResults: 3,
            publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            videoDuration: 'short'
          });

          console.log(`Found ${response.data.items?.length || 0} videos from channel ${channelId}`);

          if (response.data.items) {
            for (const item of response.data.items) {
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
      const generalSearchTerms = ['news today', 'breaking news', 'latest news'];
      
      for (const searchTerm of generalSearchTerms) {
        if (allVideos.length >= limit) break;
        
        const response = await youtube.search.list({
          part: ['snippet'],
          q: searchTerm,
          type: ['video'],
          order: 'date',
          maxResults: 5,
          publishedAfter: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          videoDuration: 'short'
        });

        if (response.data.items) {
          for (const item of response.data.items) {
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
}

function isShortVideo(duration: string): boolean {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes <= 4;
}

function hasGoodEngagement(statistics: any): boolean {
  if (!statistics) return true;
  
  const viewCount = parseInt(statistics.viewCount || '0');
  const likeCount = parseInt(statistics.likeCount || '0');
  
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
