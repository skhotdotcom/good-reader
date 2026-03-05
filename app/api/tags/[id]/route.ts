export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  try {
    db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, Number(id));
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(Number(id));
    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: 'Tag name already in use' }, { status: 409 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare('DELETE FROM tags WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
}
