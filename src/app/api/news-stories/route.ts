import { NextResponse } from 'next/server';
import { parseString } from 'xml2js';

interface NewsStory {
  id: string;
  headline: string;
  summary: string;
  category: string;
  publishedAt: string;
  articleCount: number;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: number; // 1-10 scale
  relatedVideos: string[]; // Video IDs that relate to this story
}

const CATEGORIES: { key: string; label: string; query: string }[] = [
  { key: 'top', label: 'Top Stories', query: 'top stories' },
  { key: 'politics', label: 'Politics', query: 'politics' },
  { key: 'world', label: 'World', query: 'world news' },
  { key: 'us', label: 'U.S.', query: 'us news' },
  { key: 'business', label: 'Business', query: 'business economy markets' },
  { key: 'technology', label: 'Technology', query: 'technology AI software hardware' },
  { key: 'science', label: 'Science', query: 'science space research' },
  { key: 'health', label: 'Health', query: 'health medicine public health' },
  { key: 'climate', label: 'Climate', query: 'climate environment weather' },
  { key: 'sports', label: 'Sports', query: 'sports' },
  { key: 'entertainment', label: 'Entertainment', query: 'entertainment culture film music' },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 2);
}

async function fetchGoogleNews(query: string, maxItems = 60) {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(rssUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Hermesian/1.0)' } });
  if (!response.ok) return [] as any[];
  const xmlText = await response.text();
  const parsed: any = await new Promise((resolve, reject) => {
    parseString(xmlText, (err, result) => (err ? reject(err) : resolve(result)));
  });
  const items = parsed?.rss?.channel?.[0]?.item || [];
  return items.slice(0, maxItems).map((item: any, idx: number) => {
    const title: string = item.title?.[0] || '';
    const description: string = item.description?.[0] || '';
    const link: string = item.link?.[0] || '';
    const pubDate: string = item.pubDate?.[0] || new Date().toISOString();
    const source: string = item?.source?.[0]?._ || 'Google News';
    return { id: `gns-${idx}-${Buffer.from(title).toString('base64').slice(0, 10)}`, title, description, link, pubDate, source };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '24');
    const categoryKey = searchParams.get('category') || 'top';
    const page = parseInt(searchParams.get('page') || '1');
    const q = searchParams.get('q') || '';
    const category = CATEGORIES.find(c => c.key === categoryKey) || CATEGORIES[0];

    const query = q ? q : category.query;
    const items = await fetchGoogleNews(query, 120);
    const seen = new Set<string>();
    const stories: NewsStory[] = [];
    for (const item of items) {
      const headline = item.title;
      if (seen.has(headline)) continue;
      seen.add(headline);
      const kws = Array.from(new Set([...(tokenize(item.title)), ...(tokenize(item.description))])).slice(0, 10);
      stories.push({
        id: item.id,
        headline,
        summary: item.description.replace(/<[^>]+>/g, '').slice(0, 240),
        category: category.label,
        publishedAt: new Date(item.pubDate).toISOString(),
        articleCount: Math.floor(Math.random() * 8) + 5,
        keywords: kws,
        sentiment: 'neutral',
        importance: Math.min(10, 5 + Math.floor(kws.length / 2)),
        relatedVideos: []
      });
    }

    // Pagination
    const start = (page - 1) * limit;
    const paged = stories
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(start, start + limit);

    return NextResponse.json({
      success: true,
      stories: paged,
      totalCount: stories.length,
      page,
      pageSize: limit,
      hasMore: start + limit < stories.length,
      categories: CATEGORIES.filter(c => c.key !== 'top').map(c => ({ key: c.key, label: c.label }))
    });

  } catch (error) {
    console.error('News Stories API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch news stories',
        stories: [],
        totalCount: 0
      },
      { status: 500 }
    );
  }
}

// findRelatedStory removed in favor of direct explore via /explore-story
