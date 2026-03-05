import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    feed: ['description', 'image'],
    item: ['content:encoded', 'description'],
  },
  timeout: 15000,
  headers: {
    'User-Agent': 'GoodReader/1.0 RSS Reader',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

export interface FeedMetadata {
  title: string;
  description: string;
  siteUrl: string;
  faviconUrl: string;
}

export interface ParsedArticle {
  guid: string;
  title: string;
  link: string;
  author: string;
  content: string;
  snippet: string;
  publishedAt: string;
}

export interface ParsedFeed {
  metadata: FeedMetadata;
  articles: ParsedArticle[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSnippet(html: string, maxLength = 200): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

async function resolveFaviconUrl(siteUrl: string): Promise<string> {
  let origin = '';
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return '';
  }
  const fallback = `${origin}/favicon.ico`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GoodReader/1.0 RSS Reader' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      // Match <link rel="icon">, <link rel="shortcut icon">, or <link rel="apple-touch-icon">
      const match =
        html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"'?#]+)/i) ||
        html.match(/<link[^>]+href=["']([^"'?#]+)["'][^>]*rel=["'](?:shortcut icon|icon)["']/i) ||
        html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"'?#]+)/i);

      if (match) {
        const href = match[1].trim();
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
        if (href.startsWith('/')) return `${origin}${href}`;
        return `${origin}/${href}`;
      }
    }
  } catch {
    // Timeout or fetch error — fall through to /favicon.ico
  }

  return fallback;
}

export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedFeed> {
  const feed = await parser.parseURL(feedUrl);

  const siteUrl = feed.link || feedUrl;
  const faviconUrl = await resolveFaviconUrl(siteUrl);

  const metadata: FeedMetadata = {
    title: feed.title || feedUrl,
    description: feed.description || '',
    siteUrl,
    faviconUrl,
  };

  const articles: ParsedArticle[] = (feed.items || []).map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemAny = item as any;
    const rawContent =
      itemAny['content:encoded'] ||
      item.content ||
      item.summary ||
      itemAny['description'] ||
      '';

    const guid = item.guid || itemAny.id || item.link || '';
    const link = item.link || '';
    const title = item.title || 'Untitled';
    const author = itemAny.creator || itemAny.author || '';
    const content = rawContent;
    const snippet = makeSnippet(rawContent || title);
    const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();

    return { guid, title, link, author, content, snippet, publishedAt };
  });

  return { metadata, articles };
}
