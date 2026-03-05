export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const folders = db.prepare(`
    SELECT f.*, COUNT(fd.id) as feed_count
    FROM folders f
    LEFT JOIN feeds fd ON fd.folder_id = f.id
    GROUP BY f.id
    ORDER BY f.sort_order, f.name
  `).all();

  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const result = db.prepare(
    'INSERT INTO folders (name) VALUES (?)'
  ).run(name.trim());

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(folder, { status: 201 });
}
