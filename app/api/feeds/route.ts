export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { fetchAndParseFeed } from '@/lib/feed-fetcher';

export async function GET() {
  const feeds = db.prepare(`
    SELECT f.*,
      COUNT(CASE WHEN a.is_read = 0 THEN 1 END) as unread_count
    FROM feeds f
    LEFT JOIN articles a ON a.feed_id = f.id
    GROUP BY f.id
    ORDER BY f.title
  `).all();

  return NextResponse.json(feeds);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { url, folder_id } = body;

  if (!url?.trim()) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Check for duplicate
  const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(url.trim());
  if (existing) {
    return NextResponse.json({ error: 'Feed already exists' }, { status: 409 });
  }

  let parsed;
  try {
    parsed = await fetchAndParseFeed(url.trim());
  } catch (err) {
    console.error('Feed fetch error:', err);
    return NextResponse.json(
      { error: 'Could not fetch or parse feed. Please check the URL.' },
      { status: 422 }
    );
  }

  const { metadata, articles } = parsed;

  const feedResult = db.prepare(`
    INSERT INTO feeds (url, folder_id, title, description, site_url, favicon_url, last_fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    url.trim(),
    folder_id || null,
    metadata.title,
    metadata.description,
    metadata.siteUrl,
    metadata.faviconUrl,
  );

  const feedId = feedResult.lastInsertRowid;

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (feed_id, guid, title, link, author, content, snippet, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof articles) => {
    for (const article of items) {
      insertArticle.run(
        feedId,
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

  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId);
  return NextResponse.json(feed, { status: 201 });
}
