export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

const TAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export async function GET() {
  const tags = db.prepare(`
    SELECT t.id, t.name, t.color, COUNT(at.article_id) as article_count
    FROM tags t
    LEFT JOIN article_tags at ON at.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC
  `).all();
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const count = (db.prepare('SELECT COUNT(*) as c FROM tags').get() as { c: number }).c;
  const color = TAG_COLORS[count % TAG_COLORS.length];

  try {
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color);
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }
}
