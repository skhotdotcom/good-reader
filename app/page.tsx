'use client';

import { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/top-bar';
import { Sidebar } from '@/components/sidebar';
import { ArticleList, type Article, type ArticleTag } from '@/components/article-list';
import { ReadingPane } from '@/components/reading-pane';
import { AddFeedDialog } from '@/components/add-feed-dialog';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts';
import { SettingsDialog } from '@/components/settings-dialog';
import { loadKeybindings, type Keybindings } from '@/lib/keybindings';
import { loadLMStudioConfig, type LMStudioConfig } from '@/lib/lmstudio';
import { loadLayout, DEFAULT_LAYOUT, type LayoutMode } from '@/lib/layout';
import { toast } from 'sonner';
import type { TagItem } from '@/components/sidebar';

const PAGE_SIZE = 50;

interface Feed {
  id: number;
  title: string;
  url: string;
  folder_id: number | null;
  favicon_url: string;
  unread_count: number;
}

interface Folder {
  id: number;
  name: string;
  feed_count: number;
}

type Selection =
  | { type: 'all' }
  | { type: 'unread' }
  | { type: 'starred' }
  | { type: 'folder'; id: number }
  | { type: 'feed'; id: number }
  | { type: 'tag'; id: number };

export default function Home() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selection, setSelection] = useState<Selection>({ type: 'unread' });
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number>(-1);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articlesHasMore, setArticlesHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keybindings, setKeybindings] = useState<Keybindings>(loadKeybindings);
  const [lmStudioConfig, setLmStudioConfig] = useState<LMStudioConfig>(loadLMStudioConfig);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(DEFAULT_LAYOUT);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [isElectron, setIsElectron] = useState(false);

  // Detect Electron for macOS title bar spacing
  useEffect(() => {
    setIsElectron(navigator.userAgent.includes('Electron'));
  }, []);

  // Load layout from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    setLayoutMode(loadLayout());
  }, []);

  // Debounce searchQuery → debouncedQ
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    const data = await res.json();
    setTags(data);
  }, []);

  const fetchSidebarData = useCallback(async () => {
    const [feedsRes, foldersRes] = await Promise.all([
      fetch('/api/feeds'),
      fetch('/api/folders'),
    ]);
    const feedsData = await feedsRes.json();
    const foldersData = await foldersRes.json();
    setFeeds(feedsData);
    setFolders(foldersData);
  }, []);

  const fetchArticles = useCallback(async (sel: Selection, offset = 0, append = false, q = '') => {
    if (append) setLoadingMore(true);
    else setArticlesLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (sel.type === 'feed') params.set('feed_id', String(sel.id));
      if (sel.type === 'folder') params.set('folder_id', String(sel.id));
      if (sel.type === 'starred') params.set('starred', '1');
      if (sel.type === 'unread') params.set('unread', '1');
      if (sel.type === 'tag') params.set('tag_id', String(sel.id));
      if (q) params.set('q', q);

      const res = await fetch('/api/articles?' + params);
      const data = await res.json();
      const newArticles: Article[] = data.articles || [];

      if (append) {
        setArticles((prev) => [...prev, ...newArticles]);
      } else {
        setArticles(newArticles);
        setSelectedArticle(null);
        setSelectedArticleIndex(-1);
      }
      setArticlesHasMore(offset + newArticles.length < data.total);
    } catch {
      toast.error('Failed to load articles');
    } finally {
      setArticlesLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSidebarData();
    fetchTags();
  }, [fetchSidebarData, fetchTags]);

  // Fetch whenever selection or debounced search query changes
  useEffect(() => {
    fetchArticles(selection, 0, false, debouncedQ);
  }, [selection, debouncedQ, fetchArticles]);

  // Reset search when selection changes
  const handleSetSelection = useCallback((sel: Selection) => {
    setSelection(sel);
    setSearchQuery('');
    setDebouncedQ('');
  }, []);

  const handleLoadMore = useCallback(() => {
    fetchArticles(selection, articles.length, true, debouncedQ);
  }, [fetchArticles, selection, articles.length, debouncedQ]);

  const handleSelectArticle = useCallback(async (article: Article, articleList?: Article[]) => {
    const list = articleList || articles;
    setSelectedArticle(article);
    const index = list.findIndex((a) => a.id === article.id);
    setSelectedArticleIndex(index);

    if (!article.is_read) {
      await fetch('/api/articles/' + article.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, is_read: 1 } : a)));
      setSelectedArticle((prev) => prev ? { ...prev, is_read: 1 } : prev);
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === article.feed_id ? { ...f, unread_count: Math.max(0, f.unread_count - 1) } : f
        )
      );
    }
  }, [articles]);

  const handleToggleStar = useCallback(async (article: Article) => {
    const newStarred = article.is_starred ? 0 : 1;
    await fetch('/api/articles/' + article.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_starred: newStarred }),
    });
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, is_starred: newStarred } : a)));
    setSelectedArticle((prev) => prev && prev.id === article.id ? { ...prev, is_starred: newStarred } : prev);
  }, []);

  const handleToggleRead = useCallback(async (article: Article) => {
    const newRead = article.is_read ? 0 : 1;
    await fetch('/api/articles/' + article.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: newRead }),
    });
    const delta = newRead ? -1 : 1;
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, is_read: newRead } : a)));
    setSelectedArticle((prev) => prev && prev.id === article.id ? { ...prev, is_read: newRead } : prev);
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === article.feed_id ? { ...f, unread_count: Math.max(0, f.unread_count + delta) } : f
      )
    );
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const body: Record<string, number> = {};
    if (selection.type === 'feed') body.feed_id = selection.id;
    if (selection.type === 'folder') body.folder_id = selection.id;

    await fetch('/api/articles/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setArticles((prev) => prev.map((a) => ({ ...a, is_read: 1 })));
    setFeeds((prev) =>
      prev.map((f) => {
        if (selection.type === 'feed' && f.id !== selection.id) return f;
        if (selection.type === 'folder' && f.folder_id !== selection.id) return f;
        return { ...f, unread_count: 0 };
      })
    );
  }, [selection]);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/feeds/refresh-all', { method: 'POST' });
      const data = await res.json();
      toast.success('Refreshed ' + data.succeeded + ' feeds' + (data.failed > 0 ? ', ' + data.failed + ' failed' : ''));
      await fetchSidebarData();
      await fetchArticles(selection, 0, false, debouncedQ);
    } catch {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [fetchSidebarData, fetchArticles, selection, debouncedQ]);

  // Update article tags in both articles list and selectedArticle
  const handleArticleTagsChange = useCallback((articleId: number, newTags: ArticleTag[]) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, tags: newTags } : a)));
    setSelectedArticle((prev) => prev && prev.id === articleId ? { ...prev, tags: newTags } : prev);
    // Refresh tag counts in sidebar
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        addFeedOpen ||
        shortcutsOpen
      ) return;

      const key = e.key;
      const kb = keybindings;

      if (key === kb.nextArticle) {
        e.preventDefault();
        const nextIndex = Math.min(selectedArticleIndex + 1, articles.length - 1);
        if (nextIndex >= 0 && nextIndex < articles.length) handleSelectArticle(articles[nextIndex]);
      } else if (key === kb.prevArticle) {
        e.preventDefault();
        const prevIndex = Math.max(selectedArticleIndex - 1, 0);
        if (prevIndex >= 0 && articles.length > 0) handleSelectArticle(articles[prevIndex]);
      } else if ((key === 'Enter' || key === kb.openOriginal) && !e.metaKey && !e.ctrlKey) {
        if (selectedArticle) {
          e.preventDefault();
          if (selectedArticle.link) window.open(selectedArticle.link, '_blank', 'noopener,noreferrer');
        }
      } else if (key === kb.starArticle) {
        e.preventDefault();
        if (selectedArticle) handleToggleStar(selectedArticle);
      } else if (key === kb.toggleRead) {
        e.preventDefault();
        if (selectedArticle) handleToggleRead(selectedArticle);
      } else if (key === 'r') {
        e.preventDefault();
        handleRefreshAll();
      } else if (key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    selectedArticle, selectedArticleIndex, articles, addFeedOpen, shortcutsOpen, keybindings,
    handleSelectArticle, handleToggleStar, handleToggleRead, handleRefreshAll,
  ]);

  // Flat list of ArticleTag for the tag picker (allTags without article_count)
  const allTagsForPicker: ArticleTag[] = tags.map(({ id, name, color }) => ({ id, name, color }));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isElectron && (
        <div className="flex-shrink-0 h-7" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      )}
      <TopBar
        onAddFeed={() => setAddFeedOpen(true)}
        onRefreshAll={handleRefreshAll}
        refreshing={refreshing}
        onDataChange={fetchSidebarData}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          feeds={feeds}
          folders={folders}
          tags={tags}
          selection={selection}
          onSelect={handleSetSelection}
          onDataChange={() => {
            fetchSidebarData();
            fetchArticles(selection, 0, false, debouncedQ);
          }}
          onTagsChange={fetchTags}
        />

        {(layoutMode === '3-panel' || !selectedArticle) && (
          <ArticleList
            articles={articles}
            selectedId={selectedArticle?.id ?? null}
            onSelect={handleSelectArticle}
            onToggleStar={handleToggleStar}
            onMarkAllRead={handleMarkAllRead}
            loading={articlesLoading}
            hasMore={articlesHasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            className={layoutMode === '2-panel' ? 'flex-1 w-auto' : undefined}
          />
        )}

        {(layoutMode === '3-panel' || !!selectedArticle) && (
          <ReadingPane
            article={selectedArticle}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            lmStudioConfig={lmStudioConfig}
            allTags={allTagsForPicker}
            onTagsChange={handleArticleTagsChange}
            onTagCreated={fetchTags}
            onBack={layoutMode === '2-panel' ? () => { setSelectedArticle(null); setSelectedArticleIndex(-1); } : undefined}
          />
        )}
      </div>

      <AddFeedDialog
        open={addFeedOpen}
        onOpenChange={setAddFeedOpen}
        folders={folders}
        onFeedAdded={() => {
          fetchSidebarData();
          fetchArticles(selection, 0, false, debouncedQ);
        }}
      />

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        keybindings={keybindings}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        keybindings={keybindings}
        onKeybindingsChange={setKeybindings}
        lmStudioConfig={lmStudioConfig}
        onLMStudioConfigChange={setLmStudioConfig}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      />
    </div>
  );
}
