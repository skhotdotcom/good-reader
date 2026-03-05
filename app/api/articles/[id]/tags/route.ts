export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const TAG_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = Number(id);
  const body = await req.json().catch(() => ({}));

  let tagId: number | null = body.tag_id ?? null;

  // If a name was provided instead of tag_id, find or create the tag
  if (!tagId && body.name) {
    const name = (body.name as string).trim();
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number } | undefined;
    if (existing) {
      tagId = existing.id;
    } else {
      const count = (db.prepare('SELECT COUNT(*) as c FROM tags').get() as { c: number }).c;
      const color = TAG_COLORS[count % TAG_COLORS.length];
      const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color);
      tagId = result.lastInsertRowid as number;
    }
  }

  if (!tagId) return NextResponse.json({ error: 'tag_id or name required' }, { status: 400 });

  db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)').run(articleId, tagId);

  // Return updated tag list for the article
  const tags = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM article_tags at
    JOIN tags t ON t.id = at.tag_id
    WHERE at.article_id = ?
    ORDER BY t.name ASC
  `).all(articleId);

  return NextResponse.json({ tags });
}
