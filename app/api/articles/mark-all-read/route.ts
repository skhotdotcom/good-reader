export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { feed_id, folder_id } = body;

  let sql = 'UPDATE articles SET is_read = 1 WHERE is_read = 0';
  const values: (string | number)[] = [];

  if (feed_id) {
    sql += ' AND feed_id = ?';
    values.push(feed_id);
  } else if (folder_id) {
    sql += ' AND feed_id IN (SELECT id FROM feeds WHERE folder_id = ?)';
    values.push(folder_id);
  }

  const result = db.prepare(sql).run(...values);
  return NextResponse.json({ updated: result.changes });
}
