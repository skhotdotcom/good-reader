/**
 * One-time script to backfill favicon_url for all feeds that are missing it.
 * Run with: node scripts/backfill-favicons.mjs
 */

import Database from 'better-sqlite3';

const db = new Database('data/good-reader.db');

async function resolveFaviconUrl(siteUrl) {
  let origin = '';
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return '';
  }
  const fallback = `${origin}/favicon.ico`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(siteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GoodReader/1.0 RSS Reader' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      const match =
        html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*href=["']([^"'?#]+)/i) ||
        html.match(/<link[^>]+href=["']([^"'?#]+)["'][^>]*rel=["'](?:shortcut icon|icon)["']/i) ||
        html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"'?#]+)/i);

      if (match) {
        const href = match[1].trim();
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
        if (href.startsWith('/')) return `${origin}${href}`;
        return `${origin}/${href}`;
      }
    }
  } catch {
    // Timeout or fetch error — fall through to /favicon.ico
  }

  return fallback;
}

// Also re-check feeds that only have /favicon.ico as fallback — they may have better icons
const feeds = db
  .prepare("SELECT id, url, title, site_url FROM feeds WHERE favicon_url IS NULL OR favicon_url = '' OR favicon_url LIKE '%/favicon.ico'")
  .all();

console.log(`Backfilling favicons for ${feeds.length} feeds...\n`);

const updateFeed = db.prepare('UPDATE feeds SET favicon_url = ? WHERE id = ?');

let success = 0;
let failed = 0;

// Process in batches of 5 to avoid hammering too many servers at once
const BATCH_SIZE = 5;
for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
  const batch = feeds.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(
    batch.map(async (feed) => {
      const siteUrl = feed.site_url || feed.url;
      try {
        const faviconUrl = await resolveFaviconUrl(siteUrl);
        updateFeed.run(faviconUrl, feed.id);
        console.log(`✓ [${feed.id}] ${feed.title} → ${faviconUrl}`);
        success++;
      } catch (err) {
        console.error(`✗ [${feed.id}] ${feed.title}: ${err.message}`);
        failed++;
      }
    })
  );
}

console.log(`\nDone! ${success} updated, ${failed} failed.`);
db.close();
