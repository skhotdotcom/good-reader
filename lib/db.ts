import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'good-reader.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    site_url TEXT,
    favicon_url TEXT,
    last_fetched_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    guid TEXT,
    title TEXT,
    link TEXT,
    author TEXT,
    content TEXT,
    snippet TEXT,
    published_at TEXT,
    is_read INTEGER DEFAULT 0,
    is_starred INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(feed_id, guid)
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
  CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
  CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6b7280',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
  CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);
`);

// FTS5 full-text search
// NOTE: FTS5 disallows "content" and "rank" as column names — use "lead"/"body" instead.
// On first run (or after schema fix), detect the old broken schema and rebuild.
try {
  db.prepare('SELECT lead FROM articles_fts LIMIT 1').get();
} catch {
  // Old/broken schema detected — drop and recreate
  db.exec(`
    DROP TABLE IF EXISTS articles_fts;
    DROP TRIGGER IF EXISTS articles_fts_ai;
    DROP TRIGGER IF EXISTS articles_fts_ad;

    CREATE VIRTUAL TABLE articles_fts USING fts5(title, lead, body);

    CREATE TRIGGER articles_fts_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, lead, body)
      VALUES (new.id, new.title, new.snippet, new.content);
    END;

    CREATE TRIGGER articles_fts_ad AFTER DELETE ON articles BEGIN
      DELETE FROM articles_fts WHERE rowid = old.id;
    END;
  `);

  // Populate from existing articles
  db.prepare(`
    INSERT INTO articles_fts(rowid, title, lead, body)
    SELECT id, title, snippet, content FROM articles
  `).run();
}

export default db;
