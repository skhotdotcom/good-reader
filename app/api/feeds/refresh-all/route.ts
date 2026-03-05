export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { fetchAndParseFeed } from '@/lib/feed-fetcher';

export async function POST() {
  const feeds = db.prepare('SELECT id, url, title FROM feeds').all() as {
    id: number;
    url: string;
    title: string;
  }[];

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (feed_id, guid, title, link, author, content, snippet, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const parsed = await fetchAndParseFeed(feed.url);
      const insertMany = db.transaction((items: typeof parsed.articles) => {
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
      insertMany(parsed.articles);
      const { metadata } = parsed;
      db.prepare(
        "UPDATE feeds SET last_fetched_at = datetime('now'), title = ?, site_url = ?, favicon_url = ? WHERE id = ?"
      ).run(
        metadata.title || feed.title,
        metadata.siteUrl || '',
        metadata.faviconUrl || '',
        feed.id,
      );
      return { feedId: feed.id, count: parsed.articles.length };
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ succeeded, failed, total: feeds.length });
}
