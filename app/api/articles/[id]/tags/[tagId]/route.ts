export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id, tagId } = await params;
  db.prepare('DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?')
    .run(Number(id), Number(tagId));

  // Return updated tag list
  const tags = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM article_tags at
    JOIN tags t ON t.id = at.tag_id
    WHERE at.article_id = ?
    ORDER BY t.name ASC
  `).all(Number(id));

  return NextResponse.json({ tags });
}
