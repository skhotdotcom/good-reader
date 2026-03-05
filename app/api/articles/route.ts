export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// Subquery to attach tags JSON array to each article row
const TAGS_SUBQUERY = `(
  SELECT json_group_array(json_object('id', t.id, 'name', t.name, 'color', t.color))
  FROM article_tags at2
  JOIN tags t ON t.id = at2.tag_id
  WHERE at2.article_id = a.id
) as tags_json`;

function parseArticleTags(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const tags = row.tags_json ? JSON.parse(row.tags_json as string) : [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tags_json: _, ...rest } = row;
    return { ...rest, tags };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed_id = searchParams.get('feed_id');
  const folder_id = searchParams.get('folder_id');
  const starred = searchParams.get('starred');
  const unread = searchParams.get('unread');
  const tag_id = searchParams.get('tag_id');
  const q = searchParams.get('q')?.trim();
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // FTS5 search path
  if (q) {
    const conditions: string[] = [];
    const ftsValues: (string | number)[] = [q];

    if (feed_id) { conditions.push('a.feed_id = ?'); ftsValues.push(feed_id); }
    if (folder_id) { conditions.push('f.folder_id = ?'); ftsValues.push(folder_id); }
    if (starred === '1' || starred === 'true') { conditions.push('a.is_starred = 1'); }
    if (unread === '1' || unread === 'true') { conditions.push('a.is_read = 0'); }
    if (tag_id) {
      conditions.push('a.id IN (SELECT article_id FROM article_tags WHERE tag_id = ?)');
      ftsValues.push(tag_id);
    }

    const andClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    try {
      const rows = db.prepare(`
        SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon, ${TAGS_SUBQUERY}
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.id
        JOIN feeds f ON f.id = a.feed_id
        WHERE articles_fts MATCH ? ${andClause}
        ORDER BY articles_fts.rank
        LIMIT ? OFFSET ?
      `).all(...ftsValues, limit, offset) as Record<string, unknown>[];

      const total = (db.prepare(`
        SELECT COUNT(*) as count
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.id
        JOIN feeds f ON f.id = a.feed_id
        WHERE articles_fts MATCH ? ${andClause}
      `).get(...ftsValues) as { count: number }).count;

      return NextResponse.json({ articles: parseArticleTags(rows), total, limit, offset });
    } catch {
      return NextResponse.json({ articles: [], total: 0, limit, offset });
    }
  }

  // Standard path
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (feed_id) { conditions.push('a.feed_id = ?'); values.push(feed_id); }
  if (folder_id) { conditions.push('f.folder_id = ?'); values.push(folder_id); }
  if (starred === '1' || starred === 'true') { conditions.push('a.is_starred = 1'); }
  if (unread === '1' || unread === 'true') { conditions.push('a.is_read = 0'); }
  if (tag_id) {
    conditions.push('a.id IN (SELECT article_id FROM article_tags WHERE tag_id = ?)');
    values.push(tag_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon, ${TAGS_SUBQUERY}
    FROM articles a
    JOIN feeds f ON f.id = a.feed_id
    ${where}
    ORDER BY a.published_at DESC, a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset) as Record<string, unknown>[];

  const total = (db.prepare(`
    SELECT COUNT(*) as count
    FROM articles a
    JOIN feeds f ON f.id = a.feed_id
    ${where}
  `).get(...values) as { count: number }).count;

  return NextResponse.json({ articles: parseArticleTags(rows), total, limit, offset });
}
