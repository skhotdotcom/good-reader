# Good Reader

A local-first RSS reader inspired by Google Reader. Built with Next.js, SQLite, and Tailwind CSS. Runs entirely on your machine — no accounts, no cloud, no tracking.

![Good Reader Screenshot](docs/screenshot.png)

---

## Features

### Core Reading Experience
- **Three-panel layout** — folders/feeds sidebar, article list, reading pane
- **Unread & Starred views** — fixed items at the top of the sidebar
- **Article content** — full article body rendered in a clean typography layout
- **Open original** — open the source article in a new tab
- **Mark as read/unread** — automatic on open, or toggle manually
- **Star articles** — save favorites for later

### Feed Management
- **Add feeds** — paste any RSS/Atom URL
- **Feed auto-discovery** — paste a site URL and Good Reader finds the RSS feed automatically
- **Folders** — organize feeds into collapsible folders (collapsed by default)
- **Refresh All** — fetch latest articles from all feeds at once
- **OPML import/export** — migrate from Google Reader, Feedly, or any other RSS reader

### Article Discovery
- **Full-text search** — powered by SQLite FTS5; searches titles and article bodies
- **Load more** — pagination for feeds with large backlogs (50 articles per page)
- **Auto-scroll** — article list keeps the selected item in view during keyboard navigation

### AI Summarization
- **Summarize with local LLM** — one-click summaries via [LM Studio](https://lmstudio.ai/) running on your machine
- Configurable server URL and model name in Settings
- Summary appears inline above the article content, dismissible with ×

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `j` | Next article |
| `k` | Previous article |
| `Enter` | Open original in browser |
| `s` | Star / unstar |
| `m` | Toggle read/unread |
| `r` | Refresh all feeds |
| `?` | Show keyboard shortcut help |

All shortcuts are **customizable** in Settings.

### Settings
- Remap any keyboard shortcut from a curated list of alternatives
- Configure LM Studio server URL and model name
- Settings persist in `localStorage`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | SQLite via better-sqlite3 |
| Full-text search | SQLite FTS5 virtual table |
| RSS parsing | rss-parser |
| HTML parsing | jsdom (OPML import, feed discovery) |
| AI | LM Studio (OpenAI-compatible local API) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
git clone <repo-url>
cd good-reader
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically at `data/good-reader.db` on first run.

### Adding Feeds

1. Click **+ Add Feed** in the top bar
2. Paste a feed URL (e.g. `https://hnrss.org/frontpage`) or a site URL — Good Reader will auto-discover the RSS link
3. Optionally assign to a folder and click **Add Feed**

### Importing from Another Reader

1. Export an OPML file from your current reader
2. Click **···** → **Import OPML** in Good Reader
3. All feeds and folders are imported automatically

### AI Summarization Setup

1. Download and open [LM Studio](https://lmstudio.ai/)
2. Load a model (e.g. `meta-llama-3.1-8b-instruct`)
3. Start the local server (default port: `1234`)
4. In Good Reader: **···** → **Settings** → **AI Summarization**
5. Set the model name to match what's shown in LM Studio → **Save**
6. Open any article and click **✨ Summarize**

---

## Project Structure

```
app/
  layout.tsx              — root layout, dark mode, Toaster
  page.tsx                — main three-panel UI (all state)
  globals.css             — Tailwind v4 + typography plugin
  api/
    folders/              — GET/POST/PATCH/DELETE folders
    feeds/                — GET/POST/PATCH/DELETE feeds
      discover/           — GET: auto-discover RSS from a site URL
      refresh-all/        — POST: refresh all feeds
      [id]/refresh/       — POST: refresh single feed
    articles/             — GET (with FTS search, filters) / PATCH
      [id]/summarize/     — POST: summarize via LM Studio
      mark-all-read/      — POST: bulk mark read
    opml/                 — GET: export, POST: import
components/
  sidebar.tsx             — feed/folder tree with context menus
  article-list.tsx        — scrollable article cards, search bar
  reading-pane.tsx        — article content + AI summary
  top-bar.tsx             — Refresh All, Add Feed, ··· menu
  add-feed-dialog.tsx     — add feed with auto-discovery
  settings-dialog.tsx     — keyboard shortcuts + LM Studio config
  keyboard-shortcuts.tsx  — shortcut reference dialog
lib/
  db.ts                   — SQLite singleton + schema migrations + FTS5
  feed-fetcher.ts         — rss-parser wrapper
  keybindings.ts          — keybinding types, defaults, localStorage
  lmstudio.ts             — LM Studio config types, localStorage
  utils.ts                — shadcn cn() helper
```

---

## Changelog

### Completed
- [x] Three-panel Google Reader–style layout
- [x] SQLite database with auto-migration on startup
- [x] Add / remove feeds and folders
- [x] Refresh individual feeds and refresh all
- [x] OPML import and export
- [x] Full-text search (SQLite FTS5)
- [x] Feed URL auto-discovery from site homepages
- [x] Load more / infinite scroll pagination
- [x] Auto-scroll article list on j/k navigation
- [x] Open all article links in new tab
- [x] Unread and Starred fixed sidebar items
- [x] Reading pane scrolls to top on article change
- [x] Customizable keyboard shortcuts (Settings)
- [x] Folders collapsed by default
- [x] "Inactive" folder auto-organization for stale feeds
- [x] AI summarization via LM Studio (local LLM)

### Backlog
- [ ] Dark / light mode toggle
- [ ] "Read later" queue
- [ ] Article tagging and tag-based filtering
- [ ] Mobile-responsive layout
- [ ] PWA support for offline reading

---

## Development Notes

- All API routes require `export const dynamic = 'force-dynamic'` to prevent build-time SQLite errors
- Tailwind v4: use `w-[360px]` not `w-90` (only multiples of 4 up to `w-96` are valid)
- Flex scroll pattern: `flex-1 min-h-0 overflow-y-auto` + `overflow-hidden` on the parent container
- SQLite FTS5 column names: avoid `content` and `rank` (reserved by FTS5) — use `lead`/`body` instead
- The database file at `data/good-reader.db` is gitignored

---

## License

MIT
