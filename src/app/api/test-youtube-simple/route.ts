import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Your Google API Key
const GOOGLE_API_KEY = 'AIzaSyC9Rfj-zz7bdLwfa00f9gmIdUqnG-gIxWs';

// Initialize YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: GOOGLE_API_KEY
});

export async function GET(request: Request) {
  try {
    console.log('Testing YouTube API with simple search...');

    // Test a very simple search without channel restrictions
    const response = await youtube.search.list({
      part: ['snippet'],
      q: 'news',
      type: ['video'],
      maxResults: 10,
      order: 'date',
      publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    console.log('YouTube API response:', {
      totalResults: response.data.pageInfo?.totalResults,
      itemsFound: response.data.items?.length || 0
    });

    const videos = response.data.items?.slice(0, 5).map(item => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      channelId: item.snippet?.channelId,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      embedUrl: `https://www.youtube.com/embed/${item.id?.videoId}`
    })) || [];

    return NextResponse.json({
      success: true,
      totalResults: response.data.pageInfo?.totalResults,
      itemsFound: response.data.items?.length || 0,
      videos: videos
    });

  } catch (error) {
    console.error('YouTube API test error:', error);
    return NextResponse.json({
      error: 'YouTube API test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
