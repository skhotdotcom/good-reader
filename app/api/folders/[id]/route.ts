export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const result = db.prepare(
    'UPDATE folders SET name = ? WHERE id = ?'
  ).run(name.trim(), id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  return NextResponse.json(folder);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Feeds in this folder become uncategorized (folder_id set to NULL via ON DELETE SET NULL)
  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
