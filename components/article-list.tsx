'use client';

import { useRef, useEffect } from 'react';
import { Star, CheckCheck, Rss, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ArticleTag {
  id: number;
  name: string;
  color: string;
}

export interface Article {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  author: string;
  content: string;
  snippet: string;
  published_at: string;
  is_read: number;
  is_starred: number;
  feed_title: string;
  feed_favicon: string;
  tags?: ArticleTag[];
}

interface ArticleListProps {
  articles: Article[];
  selectedId: number | null;
  onSelect: (article: Article) => void;
  onToggleStar: (article: Article) => void;
  onMarkAllRead: () => void;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function ArticleList({
  articles,
  selectedId,
  onSelect,
  onToggleStar,
  onMarkAllRead,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  searchQuery,
  onSearchChange,
}: ArticleListProps) {
  if (loading) {
    return (
      <div className="w-[360px] flex-shrink-0 border-r border-border flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-card flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search articles…" className="h-7 pl-7 text-xs" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px] flex-shrink-0 border-r border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-card flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'item' : 'items'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onMarkAllRead}
            disabled={articles.every((a) => a.is_read === 1)}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search articles…"
            className="h-7 pl-7 pr-7 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Rss className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No articles</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                selected={article.id === selectedId}
                onSelect={() => onSelect(article)}
                onToggleStar={(e) => {
                  e.stopPropagation();
                  onToggleStar(article);
                }}
              />
            ))}
            {hasMore && (
              <div className="p-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ArticleCardProps {
  article: Article;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: (e: React.MouseEvent) => void;
}

function ArticleCard({ article, selected, onSelect, onToggleStar }: ArticleCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      className={cn(
        'w-full text-left px-3 py-3 transition-colors group cursor-pointer',
        selected
          ? 'bg-accent text-accent-foreground'
          : article.is_read
          ? 'hover:bg-accent/30 opacity-70'
          : 'hover:bg-accent/30'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={cn('text-sm leading-snug line-clamp-2', article.is_read ? 'font-normal' : 'font-semibold')}>
            {article.title || 'Untitled'}
          </p>

          {/* Feed + time */}
          <div className="flex items-center gap-1.5 mt-1">
            {article.feed_favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.feed_favicon}
                alt=""
                className="h-3 w-3 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <span className="text-xs text-muted-foreground truncate">{article.feed_title}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">· {relativeTime(article.published_at)}</span>
          </div>

          {/* Snippet */}
          {article.snippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {article.snippet}
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-1.5 py-px rounded-full leading-none"
                  style={{
                    backgroundColor: tag.color + '25',
                    color: tag.color,
                    border: `1px solid ${tag.color}50`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{article.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Star */}
        <button
          onClick={onToggleStar}
          className={cn(
            'flex-shrink-0 mt-0.5 p-0.5 rounded transition-opacity',
            article.is_starred
              ? 'text-yellow-500 opacity-100'
              : 'text-muted-foreground opacity-0 group-hover:opacity-50 hover:!opacity-100'
          )}
        >
          <Star className="h-3.5 w-3.5" fill={article.is_starred ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
