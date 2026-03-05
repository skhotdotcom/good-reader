export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = db.prepare('DELETE FROM feeds WHERE id = ?').run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, folder_id } = body;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (folder_id !== undefined) {
    updates.push('folder_id = ?');
    values.push(folder_id);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  const result = db.prepare(
    `UPDATE feeds SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
  }

  const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(id);
  return NextResponse.json(feed);
}
