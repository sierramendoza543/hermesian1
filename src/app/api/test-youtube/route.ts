import { NextResponse } from 'next/server';
import { youtube } from '@/services/gemini';

export async function GET(request: Request) {
  try {
    console.log('Testing YouTube API...');
    
    if (!youtube) {
      return NextResponse.json({
        error: 'YouTube API not available',
        reason: 'youtube object is null'
      }, { status: 500 });
    }

    console.log('YouTube API object exists, testing search...');

    // Test a simple search
    const response = await youtube.search.list({
      part: ['snippet'],
      q: 'news today',
      type: ['video'],
      maxResults: 5,
      order: 'date'
    });

    console.log('YouTube API response:', response.data);

    return NextResponse.json({
      success: true,
      itemsFound: response.data.items?.length || 0,
      items: response.data.items?.slice(0, 3).map(item => ({
        id: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt
      })) || []
    });

  } catch (error) {
    console.error('YouTube API test error:', error);
    return NextResponse.json({
      error: 'YouTube API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
