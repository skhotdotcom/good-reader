export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { fetchAndParseFeed } from '@/lib/feed-fetcher';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(id) as {
    id: number;
    url: string;
    title: string;
  } | undefined;

  if (!feed) {
    return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
  }

  let parsed;
  try {
    parsed = await fetchAndParseFeed(feed.url);
  } catch (err) {
    console.error('Feed refresh error:', err);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 422 });
  }

  const { articles } = parsed;

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (feed_id, guid, title, link, author, content, snippet, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof articles) => {
    for (const article of items) {
      insertArticle.run(
        feed.id,
        article.guid,
        article.title,
        article.link,
        article.author,
        article.content,
        article.snippet,
        article.publishedAt,
      );
    }
  });

  insertMany(articles);

  const { metadata } = parsed;
  db.prepare(
    "UPDATE feeds SET last_fetched_at = datetime('now'), title = ?, site_url = ?, favicon_url = ? WHERE id = ?"
  ).run(
    metadata.title || feed.title,
    metadata.siteUrl || '',
    metadata.faviconUrl || '',
    id,
  );

  return NextResponse.json({ success: true, count: articles.length });
}
