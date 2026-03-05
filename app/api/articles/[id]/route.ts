export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { is_read, is_starred } = body;

  const updates: string[] = [];
  const values: (number | string)[] = [];

  if (is_read !== undefined) {
    updates.push('is_read = ?');
    values.push(is_read ? 1 : 0);
  }

  if (is_starred !== undefined) {
    updates.push('is_starred = ?');
    values.push(is_starred ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  const result = db.prepare(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  return NextResponse.json(article);
}
