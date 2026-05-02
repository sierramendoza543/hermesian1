import { NextResponse } from 'next/server';
import { genAI } from '@/services/gemini';
import { parseString } from 'xml2js';

interface ArticleMatch {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  similarity: number; // 0-100 percentage
  matchingKeywords: string[];
  summary: string;
  quickStats?: {
    biasScore: number; // 0-1
    ideology: 'Left' | 'Center' | 'Right';
    color: string; // hex/tag
  };
}

// Mock articles for demonstration - in production, this would search real news APIs
const MOCK_ARTICLES = [
  {
    id: 'art-1',
    title: 'Trump Third Term Discussions Gain Momentum in Republican Circles',
    description: 'House Speaker Mike Johnson addresses growing discussions about potential third term for former President Trump, as Republican lawmakers weigh constitutional implications.',
    source: 'Politico',
    url: 'https://politico.com/trump-third-term-discussions',
    publishedAt: new Date().toISOString(),
    keywords: ['trump', 'third term', 'republican', 'constitution', 'johnson', 'house speaker']
  },
  {
    id: 'art-2',
    title: 'Constitutional Experts Weigh In on Trump Third Term Possibility',
    description: 'Legal scholars debate the constitutional framework for presidential term limits as discussions about Trump\'s potential third term intensify.',
    source: 'The Washington Post',
    url: 'https://washingtonpost.com/trump-third-term-constitution',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    keywords: ['trump', 'constitution', 'term limits', 'legal', 'experts', 'president']
  },
  {
    id: 'art-3',
    title: 'UK Migrant Hotel Crisis: Government Faces Backlash Over Housing Policy',
    description: 'The UK government struggles to find alternatives to housing migrants in hotels as the crisis continues to escalate, with local communities expressing frustration.',
    source: 'BBC News',
    url: 'https://bbc.com/uk-migrant-hotel-crisis',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    keywords: ['uk', 'migrants', 'hotels', 'crisis', 'government', 'housing', 'policy']
  },
  {
    id: 'art-4',
    title: 'Drug Enforcement Operations Result in Multiple Casualties',
    description: 'Intensive drug enforcement operations across multiple regions have resulted in casualties as authorities crack down on alleged drug trafficking networks.',
    source: 'Associated Press',
    url: 'https://ap.org/drug-enforcement-casualties',
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    keywords: ['drugs', 'enforcement', 'casualties', 'trafficking', 'operations', 'authorities']
  },
  {
    id: 'art-5',
    title: 'Middle East Tensions Escalate as Lebanon Calls for End to Israeli Attacks',
    description: 'Lebanese officials, including former President Aoun, call for immediate end to Israeli attacks as tensions in the region continue to rise, with US envoys attempting mediation.',
    source: 'Reuters',
    url: 'https://reuters.com/lebanon-israel-tensions',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    keywords: ['lebanon', 'israel', 'middle east', 'tensions', 'aoun', 'us envoy', 'attacks']
  },
  {
    id: 'art-6',
    title: 'Chicago Police Controversy: Senior Official Throws Tear Gas at Residents',
    description: 'A senior Chicago police official faces criticism after throwing tear gas at residents during a protest, sparking calls for accountability and reform.',
    source: 'Chicago Tribune',
    url: 'https://chicagotribune.com/police-tear-gas-controversy',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    keywords: ['chicago', 'police', 'tear gas', 'controversy', 'protest', 'accountability']
  },
  {
    id: 'art-7',
    title: 'Historic Presidential Election: World\'s Oldest President Wins Eighth Term',
    description: 'In a historic moment for democracy, the world\'s oldest president on record has won an unprecedented eighth term, marking a significant milestone in electoral history.',
    source: 'The New York Times',
    url: 'https://nytimes.com/oldest-president-eighth-term',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    keywords: ['president', 'election', 'historic', 'eighth term', 'democracy', 'oldest']
  }
];

const STOPWORDS = new Set([
  'the','and','for','that','with','this','from','have','has','was','were','you','your','their','they','them','his','her','its','our','out','but','are','not','can','into','over','after','just','now','about','into','onto','than','then','very','more','most','some','any','all','each','other','such','only','been','also','will','would','could','should','might','may'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function calculateSimilarity(videoText: string, articleText: string, articleTitle: string): { similarity: number; matchingKeywords: string[] } {
  const videoWords = tokenize(videoText);
  const articleWords = tokenize(articleText);
  const titleWords = tokenize(articleTitle);

  const videoSet = new Set(videoWords);
  const articleSet = new Set(articleWords);
  const titleSet = new Set(titleWords);

  // Overlap with body and title
  const commonBody = [...videoSet].filter(w => articleSet.has(w));
  const commonTitle = [...videoSet].filter(w => titleSet.has(w));

  // Score: title matches weighted higher
  const rawScore = commonBody.length + commonTitle.length * 2;
  const denom = Math.max(videoWords.length, 1);
  let similarity = Math.min(100, Math.round((rawScore / denom) * 100));

  // Boost if article title contains exact video keywords phrase segments
  const phrase = videoText.toLowerCase();
  if (articleTitle.toLowerCase().includes(phrase.slice(0, Math.min(30, phrase.length)))) {
    similarity = Math.min(100, similarity + 10);
  }

  // Unique top keywords
  const matchingKeywords = Array.from(new Set([...commonTitle, ...commonBody])).slice(0, 6);

  return { similarity, matchingKeywords };
}

function estimateQuickStats(source: string, description: string): { biasScore: number; ideology: 'Left' | 'Center' | 'Right'; color: string } {
  const s = source.toLowerCase();
  // Primitive source-based leaning map
  let bias = 0.5; let ideology: 'Left' | 'Center' | 'Right' = 'Center'; let color = '#64748b';
  if (/(nytimes|cnn|washington post|npr|guardian|sfgate)/.test(s)) { bias = 0.35; ideology = 'Left'; color = '#3b82f6'; }
  if (/(fox|daily mail|new york post|breitbart)/.test(s)) { bias = 0.65; ideology = 'Right'; color = '#ef4444'; }
  if (/(reuters|ap|associated press|bbc|wsj|financial times|bloomberg)/.test(s)) { bias = 0.5; ideology = 'Center'; color = '#10b981'; }
  // Nudge by words in description
  const desc = description.toLowerCase();
  if (/(climate|equity|diversity|rights|welfare)/.test(desc)) bias = Math.max(0, bias - 0.05);
  if (/(border|crime|tax cuts|regulation)/.test(desc)) bias = Math.min(1, bias + 0.05);
  if (bias < 0.45) { ideology = 'Left'; color = '#3b82f6'; }
  else if (bias > 0.55) { ideology = 'Right'; color = '#ef4444'; }
  else { ideology = 'Center'; color = '#10b981'; }
  return { biasScore: Number(bias.toFixed(2)), ideology, color };
}

async function fetchGoogleNewsArticles(query: string, maxItems: number = 15): Promise<{
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}[]> {
  try {
    // Extract key terms from the query for broader search
    const keyTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
      .slice(0, 3); // Take top 3 meaningful terms
    
    // Create multiple search queries for better coverage
    const searchQueries = [
      query, // Original query
      keyTerms.join(' '), // Key terms only
      keyTerms[0] + ' ' + keyTerms[1], // First two terms
      keyTerms[0] // Most important term
    ].filter(Boolean);
    
    const allArticles: any[] = [];
    
    for (const searchQuery of searchQueries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
      try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Hermesian/1.0)'
          }
        });
        if (!response.ok) continue;
        
        const xmlText = await response.text();
        const parsed: any = await new Promise((resolve, reject) => {
          parseString(xmlText, (err, result) => (err ? reject(err) : resolve(result)));
        });
        const items = parsed?.rss?.channel?.[0]?.item || [];
        
        const articles = items.slice(0, Math.ceil(maxItems / 2)).map((item: any, idx: number) => {
          const title: string = item.title?.[0] || '';
          const description: string = item.description?.[0] || '';
          const link: string = item.link?.[0] || '';
          const pubDate: string = item.pubDate?.[0] || new Date().toISOString();
          const source: string = item?.source?.[0]?._ || 'Google News';
          return {
            id: `gn-${searchQuery.slice(0, 3)}-${idx}-${Buffer.from(title).toString('base64').slice(0, 12)}`,
            title,
            description,
            source,
            url: link,
            publishedAt: new Date(pubDate).toISOString(),
          };
        });
        
        allArticles.push(...articles);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`Failed to fetch for query "${searchQuery}":`, err);
      }
    }
    
    // Remove duplicates by title and source
    const uniqueArticles = allArticles.reduce((acc: Array<{ title: string; source: string } & Record<string, any>>, article: { title: string; source: string } & Record<string, any>) => {
      const key = `${article.title}-${article.source}`;
      if (!acc.find((a) => `${a.title}-${a.source}` === key)) {
        acc.push(article);
      }
      return acc;
    }, []);
    
    return uniqueArticles.slice(0, maxItems);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoTitle = searchParams.get('title') || '';
    const videoDescription = searchParams.get('description') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log('Searching for articles matching video:', { videoTitle, videoDescription });

    if (!videoTitle && !videoDescription) {
      return NextResponse.json({
        success: false,
        error: 'Video title or description is required',
        articles: []
      }, { status: 400 });
    }

    const videoText = `${videoTitle} ${videoDescription}`.toLowerCase();

    // Try Google News RSS first for broader coverage
    const googleNewsArticles = await fetchGoogleNewsArticles(videoTitle, 25);

    // Combine sources
    const candidateArticles = [
      ...googleNewsArticles,
      ...MOCK_ARTICLES,
    ];

    // Calculate similarity for each article
    const articleMatches: ArticleMatch[] = candidateArticles.map(article => {
      const articleText = `${article.title} ${article.description}`.toLowerCase();
      const { similarity, matchingKeywords } = calculateSimilarity(videoText, articleText, article.title);
      const quick = estimateQuickStats(article.source, article.description);
      
      return {
        id: (article as any).id,
        title: article.title,
        description: article.description,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
        similarity,
        matchingKeywords,
        summary: article.description.substring(0, 150) + '...',
        quickStats: quick
      };
    });

    // More lenient filtering: require at least 1 matching keyword and 10% similarity
    const relevantArticles = articleMatches
      .filter(article => {
        const cleanTitle = (article.title || '').toString().trim()
        const cleanDesc = (article.description || '').toString().replace(/<[^>]+>/g, '').trim()
        return cleanTitle && cleanDesc && cleanDesc.length > 30 && article.similarity >= 10 && article.matchingKeywords.filter(k => !STOPWORDS.has(k)).length >= 1
      })
      .map(a => ({
        ...a,
        description: a.description.replace(/<[^>]+>/g, '')
      }))
      .sort((a, b) => {
        // Prioritize by similarity, then by recency, then by source diversity
        if (b.similarity !== a.similarity) return b.similarity - a.similarity;
        if (new Date(b.publishedAt).getTime() !== new Date(a.publishedAt).getTime()) {
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
        // Prefer different sources
        return a.source.localeCompare(b.source);
      })
      .slice(0, limit);

    // If no articles meet the threshold, return the most similar ones anyway
    if (relevantArticles.length === 0) {
      const fallbackArticles = articleMatches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, Math.min(3, limit));
      
      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        totalCount: fallbackArticles.length,
        searchQuery: videoText,
        note: 'No highly similar articles found, showing most relevant matches'
      });
    }

    return NextResponse.json({
      success: true,
      articles: relevantArticles,
      totalCount: relevantArticles.length,
      searchQuery: videoText,
      note: `Found ${relevantArticles.length} articles with similarity scores`
    });

  } catch (error) {
    console.error('Article Search API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search articles',
        articles: []
      },
      { status: 500 }
    );
  }
}
