export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedRow {
  id: number;
  folder_id: number | null;
  url: string;
  title: string | null;
  site_url: string | null;
  favicon_url: string | null;
}

interface FolderRow {
  id: number;
  name: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function feedOutline(feed: FeedRow): string {
  const title = escapeXml(feed.title || feed.url);
  const xmlUrl = escapeXml(feed.url);
  const htmlUrl = escapeXml(feed.site_url || '');
  return `<outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`;
}

// ── GET — Export ───────────────────────────────────────────────────────────────

export async function GET() {
  const folders = db.prepare(
    'SELECT * FROM folders ORDER BY sort_order, name'
  ).all() as FolderRow[];

  const feeds = db.prepare(
    'SELECT * FROM feeds ORDER BY title'
  ).all() as FeedRow[];

  const byFolder: Record<number, FeedRow[]> = {};
  const uncategorized: FeedRow[] = [];

  for (const feed of feeds) {
    if (feed.folder_id) {
      (byFolder[feed.folder_id] ??= []).push(feed);
    } else {
      uncategorized.push(feed);
    }
  }

  const indent = (s: string, n: number) => ' '.repeat(n) + s;
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>Good Reader Subscriptions</title>`,
    `    <dateCreated>${new Date().toUTCString()}</dateCreated>`,
    '  </head>',
    '  <body>',
  ];

  for (const folder of folders) {
    lines.push(indent(`<outline text="${escapeXml(folder.name)}" title="${escapeXml(folder.name)}">`, 4));
    for (const feed of byFolder[folder.id] || []) {
      lines.push(indent(feedOutline(feed), 6));
    }
    lines.push(indent('</outline>', 4));
  }

  for (const feed of uncategorized) {
    lines.push(indent(feedOutline(feed), 4));
  }

  lines.push('  </body>', '</opml>');

  const date = new Date().toISOString().split('T')[0];
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="good-reader-${date}.opml"`,
    },
  });
}

// ── POST — Import ──────────────────────────────────────────────────────────────

interface ParsedFeed {
  title: string;
  url: string;
  siteUrl: string;
}

interface ParsedFolder {
  name: string;
  feeds: ParsedFeed[];
}

function parseOpml(xml: string): { folders: ParsedFolder[]; uncategorized: ParsedFeed[] } {
  // Use jsdom for reliable XML parsing (already a project dependency)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(xml, { contentType: 'application/xml' });
  const doc = dom.window.document as Document;

  const body = doc.querySelector('body');
  if (!body) return { folders: [], uncategorized: [] };

  const folders: ParsedFolder[] = [];
  const uncategorized: ParsedFeed[] = [];

  function parseFeedOutline(el: Element): ParsedFeed | null {
    const url = el.getAttribute('xmlUrl') || el.getAttribute('xmlurl');
    if (!url) return null;
    return {
      title: el.getAttribute('text') || el.getAttribute('title') || url,
      url,
      siteUrl: el.getAttribute('htmlUrl') || el.getAttribute('htmlurl') || '',
    };
  }

  for (const outline of Array.from(body.children)) {
    const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('xmlurl');
    if (xmlUrl) {
      // Top-level feed (uncategorized)
      const feed = parseFeedOutline(outline);
      if (feed) uncategorized.push(feed);
    } else {
      // Folder containing feeds
      const folderName = outline.getAttribute('text') || outline.getAttribute('title') || 'Imported';
      const feeds: ParsedFeed[] = [];
      for (const child of Array.from(outline.children)) {
        const feed = parseFeedOutline(child);
        if (feed) feeds.push(feed);
      }
      folders.push({ name: folderName, feeds });
    }
  }

  return { folders, uncategorized };
}

export async function POST(request: Request) {
  let xml: string;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    xml = await file.text();
  } else {
    // Raw XML body
    xml = await request.text();
  }

  if (!xml.trim()) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }

  let parsed: ReturnType<typeof parseOpml>;
  try {
    parsed = parseOpml(xml);
  } catch {
    return NextResponse.json({ error: 'Could not parse OPML file' }, { status: 422 });
  }

  const insertFeed = db.prepare(`
    INSERT OR IGNORE INTO feeds (url, folder_id, title, site_url)
    VALUES (?, ?, ?, ?)
  `);

  let foldersCreated = 0;
  let feedsAdded = 0;
  let feedsSkipped = 0;

  const processFeeds = db.transaction(
    (feedList: ParsedFeed[], folderId: number | null) => {
      for (const feed of feedList) {
        if (!feed.url) continue;
        const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(feed.url);
        if (existing) {
          feedsSkipped++;
          continue;
        }
        insertFeed.run(feed.url, folderId, feed.title || null, feed.siteUrl || null);
        feedsAdded++;
      }
    }
  );

  // Process folders
  for (const folder of parsed.folders) {
    let folderRow = db.prepare('SELECT id FROM folders WHERE name = ?').get(
      folder.name
    ) as { id: number } | undefined;

    if (!folderRow) {
      const r = db.prepare('INSERT INTO folders (name) VALUES (?)').run(folder.name);
      folderRow = { id: Number(r.lastInsertRowid) };
      foldersCreated++;
    }

    processFeeds(folder.feeds, folderRow.id);
  }

  // Process uncategorized feeds
  processFeeds(parsed.uncategorized, null);

  return NextResponse.json({ foldersCreated, feedsAdded, feedsSkipped });
}
