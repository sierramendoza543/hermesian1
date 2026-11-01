import { NextResponse } from 'next/server';
import { parseString } from 'xml2js';

// Verified news channel IDs - all tested and confirmed to be correct
const NEWS_CHANNELS = [
  { id: 'UCBi2mrWuNuyYy4gbM6fU18Q', name: 'ABC News' }, // Verified: ABC News
  { id: 'UC16niRr50-MSBwiO3YDb3RA', name: 'BBC News' }, // Verified: BBC News
  { id: 'UCupvZG-5ko_eiXAupbDfxWw', name: 'CNN' }, // Verified: CNN
  { id: 'UCNye-wNBqNL5ZzHSJj3l8Bg', name: 'Al Jazeera English' }, // Verified: Al Jazeera English
  { id: 'UCqnbDFdCpuN8CMEg0VuEBqA', name: 'The New York Times' }, // Verified: The New York Times
];

interface VideoItem {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  thumbnail: string;
  embedUrl: string;
  viewCount: string;
  likeCount: string;
  topic: string;
}

async function getRealNewsVideos(limit: number): Promise<VideoItem[]> {
  const allVideos: VideoItem[] = [];

  // Fetch from all verified news channels
  for (const channel of NEWS_CHANNELS) {
    try {
      console.log(`Fetching RSS feed from ${channel.name}...`);
      
      // Get RSS feed for this channel
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsFeed/1.0)',
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch RSS for ${channel.name}: ${response.status}`);
        continue;
      }

      const xmlText = await response.text();
      
      // Parse XML
      const result = await new Promise((resolve, reject) => {
        parseString(xmlText, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const entries = (result as any)?.feed?.entry || [];
      console.log(`Found ${entries.length} entries from ${channel.name}`);
      
      // Get videos from this channel (limit to 2 per channel for variety)
      for (const entry of entries.slice(0, 2)) {
        try {
          const videoId = entry['yt:videoId']?.[0];
          const title = entry.title?.[0] || '';
          const description = entry['media:group']?.[0]?.['media:description']?.[0] || '';
          const publishedAt = entry.published?.[0] || '';
          const channelTitle = entry.author?.[0]?.name?.[0] || channel.name;
          const thumbnail = entry['media:group']?.[0]?.['media:thumbnail']?.[0]?.$?.url || '';

          // Validate that this is actually from the expected news channel
          if (isValidNewsChannel(channelTitle, channel.name) && isNewsContent(title, description)) {
            allVideos.push({
              id: videoId,
              title: title,
              description: description,
              channelTitle: channelTitle,
              channelId: channel.id,
              publishedAt: publishedAt,
              duration: 'PT5M00S',
              thumbnail: thumbnail,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
              viewCount: '0',
              likeCount: '0',
              topic: categorizeVideo(title, description)
            });
            console.log(`Added video: "${title}" from ${channelTitle}`);
          } else {
            console.log(`Filtered out video: "${title}" from ${channelTitle} (not valid news content)`);
          }
        } catch (entryError) {
          console.warn(`Error processing video entry:`, entryError);
        }
      }
    } catch (channelError) {
      console.warn(`Error fetching RSS from ${channel.name}:`, channelError);
    }
    
    // Small delay to avoid overwhelming servers
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Remove duplicates by video ID and sort by publish date (newest first)
  const uniqueVideos = allVideos.reduce((acc, video) => {
    if (!acc.find(v => v.id === video.id)) {
      acc.push(video);
    }
    return acc;
  }, [] as VideoItem[]);

  const sortedVideos = uniqueVideos
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);

  console.log(`Found ${sortedVideos.length} unique real news videos from RSS feeds`);
  return sortedVideos;
}

function isReasonableLength(duration: string): boolean {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  const totalMinutes = hours * 60 + minutes + seconds / 60;
  return totalMinutes <= 10; // Up to 10 minutes for news content
}

function isValidNewsChannel(channelTitle: string, expectedChannel: string): boolean {
  // Map of expected channel names to their actual YouTube channel titles
  const channelMappings = {
    'ABC News': ['abc news'],
    'BBC News': ['bbc news'],
    'CNN': ['cnn'],
    'Al Jazeera English': ['al jazeera english', 'al jazeera'],
    'The New York Times': ['the new york times', 'new york times']
  };
  
  const expectedTitles = channelMappings[expectedChannel as keyof typeof channelMappings] || [];
  
  return expectedTitles.some(title => 
    channelTitle.toLowerCase().includes(title.toLowerCase())
  );
}

function isLikelyNewsChannel(channelTitle: string): boolean {
  const newsChannels = [
    'bbc news', 'pbs newshour', 'bloomberg', 'cnn', 'the economist',
    'financial times', 'npr', 'vox', 'the atlantic', 'the guardian',
    'abc news', 'cbs news', 'nbc news', 'fox news', 'reuters',
    'associated press', 'wall street journal', 'new york times',
    'washington post', 'usa today', 'al jazeera english', 'al jazeera'
  ];
  
  return newsChannels.some(channel => 
    channelTitle.toLowerCase().includes(channel.toLowerCase())
  );
}

function isNewsContent(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase();
  
  // Filter out obvious non-news content
  const nonNewsKeywords = [
    'rick astley', 'never gonna give you up', 'gangnam style', 'music video',
    'song', 'music', 'entertainment', 'funny', 'comedy', 'meme', 'viral',
    'tutorial', 'how to', 'cooking', 'recipe', 'gaming', 'gameplay',
    'unboxing', 'review', 'prank', 'challenge', 'dance', 'dancing',
    'programming', 'coding', 'course', 'learn', 'freecodecamp',
    'serverless', 'microservices', 'azure', 'docker', 'kubernetes',
    'javascript', 'python', 'react', 'node.js', 'web development',
    'mark rober', 'mkbhd', 'mrbeast', 'ted-ed', 'andrew huberman'
  ];
  
  // Check if it contains non-news keywords
  for (const keyword of nonNewsKeywords) {
    if (text.includes(keyword)) {
      return false;
    }
  }
  
  // For ABC News, be more lenient - include most content that's not obviously non-news
  const newsKeywords = [
    'news', 'breaking', 'report', 'update', 'developing', 'latest',
    'politics', 'government', 'election', 'policy', 'congress',
    'economy', 'market', 'financial', 'business', 'trade',
    'international', 'world', 'global', 'foreign', 'diplomacy',
    'health', 'medical', 'pandemic', 'covid', 'vaccine',
    'climate', 'environment', 'weather', 'disaster',
    'crime', 'police', 'court', 'legal', 'justice',
    'war', 'conflict', 'military', 'defense', 'security',
    'election', 'vote', 'campaign', 'candidate', 'president',
    'dead', 'strikes', 'hurricane', 'shutdown', 'pentagon',
    'jamaica', 'boats', 'drugs', 'martinez', 'kingston'
  ];
  
  // If it's from ABC News and doesn't contain obvious non-news keywords, include it
  return newsKeywords.some(keyword => text.includes(keyword)) || 
         (!nonNewsKeywords.some(keyword => text.includes(keyword)) && text.length > 10);
}

function categorizeVideo(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('technology')) {
    return 'Technology';
  } else if (text.includes('climate') || text.includes('environment') || text.includes('global warming')) {
    return 'Environment';
  } else if (text.includes('economy') || text.includes('market') || text.includes('financial')) {
    return 'Economy';
  } else if (text.includes('space') || text.includes('nasa') || text.includes('astronomy')) {
    return 'Space';
  } else if (text.includes('health') || text.includes('medical') || text.includes('healthcare')) {
    return 'Health';
  } else if (text.includes('politics') || text.includes('election') || text.includes('government')) {
    return 'Politics';
  } else if (text.includes('war') || text.includes('conflict') || text.includes('military')) {
    return 'International';
  } else {
    return 'General News';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15');

    // Try to fetch real videos from RSS feeds first
    let realVideos: VideoItem[] = [];
    try {
      realVideos = await getRealNewsVideos(limit); // Get up to the full limit of real videos
    } catch (rssError) {
      console.warn('RSS feeds failed:', rssError);
    }

    return NextResponse.json({
      success: true,
      videos: realVideos.slice(0, limit),
      totalCount: realVideos.length,
      channels: NEWS_CHANNELS.map(c => c.name),
    });

  } catch (error) {
    console.error('News Feed API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch news videos',
        videos: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}