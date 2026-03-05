export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

interface DiscoveredFeed {
  url: string;
  title: string;
  type: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url')?.trim();

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoodReader/1.0 (RSS feed discovery)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    // If the URL already points to a feed, return it directly
    if (
      contentType.includes('rss') ||
      contentType.includes('atom') ||
      contentType.includes('xml')
    ) {
      return NextResponse.json({ feeds: [] });
    }
    html = await res.text();
  } catch {
    return NextResponse.json({ error: 'Could not fetch URL' }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html);
  const doc = dom.window.document as Document;

  const feeds: DiscoveredFeed[] = [];
  const seen = new Set<string>();

  for (const link of Array.from(doc.querySelectorAll('link[rel="alternate"]')) as Element[]) {
    const type = link.getAttribute('type') || '';
    const href = link.getAttribute('href') || '';
    const title = link.getAttribute('title') || '';

    if (!href) continue;
    if (!type.includes('rss') && !type.includes('atom') && !type.includes('feed')) continue;

    const feedUrl = new URL(href, url).toString();
    if (seen.has(feedUrl)) continue;
    seen.add(feedUrl);

    feeds.push({ url: feedUrl, title, type });
  }

  return NextResponse.json({ feeds });
}
