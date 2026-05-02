import { NextResponse } from 'next/server';

const API_URL = 'https://newsapi.org/v2';
const KEY = process.env.NEWSAPI_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const endpoint = query
    ? `${API_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20`
    : `${API_URL}/top-headlines?country=us&pageSize=20`;

  const res = await fetch(endpoint, {
    headers: { 'X-Api-Key': KEY || '' }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: res.status });
  }

  const data = await res.json();
  // Map to our Article interface
  const articles = data.articles.map((a: any, idx: number) => ({
    id: a.url || idx.toString(),
    title: a.title,
    source: a.source.name,
    date: a.publishedAt,
    summary: a.description || a.content || '',
    imageURL: a.urlToImage || '/placeholder.png',
    category: a.source.name
  }));

  return NextResponse.json(articles, { 
    status: 200, 
    headers: { 
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
      'Content-Type': 'application/json'
    } 
  });
} 