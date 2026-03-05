'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, ExternalLink, BookOpen, Sparkles, X, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Article, ArticleTag } from './article-list';
import type { LMStudioConfig } from '@/lib/lmstudio';

interface ReadingPaneProps {
  article: Article | null;
  onToggleStar: (article: Article) => void;
  onToggleRead: (article: Article) => void;
  lmStudioConfig: LMStudioConfig;
  allTags: ArticleTag[];
  onTagsChange: (articleId: number, tags: ArticleTag[]) => void;
  onTagCreated: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, form, input, button');
    dangerous.forEach((el) => el.remove());
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        if (
          attr.name.startsWith('on') ||
          (attr.name === 'href' && attr.value.startsWith('javascript:')) ||
          (attr.name === 'src' && attr.value.startsWith('javascript:'))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });
    doc.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    return doc.body.innerHTML;
  } catch {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  }
}

// ─── Tag Picker ───────────────────────────────────────────────────────────────

interface TagPickerProps {
  articleId: number;
  articleTags: ArticleTag[];
  allTags: ArticleTag[];
  onTagsChange: (tags: ArticleTag[]) => void;
  onTagCreated: () => void;
}

function TagPicker({ articleId, articleTags, allTags, onTagsChange, onTagCreated }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else setQuery('');
  }, [open]);

  const existingIds = new Set(articleTags.map((t) => t.id));
  const filtered = allTags.filter(
    (t) => !existingIds.has(t.id) && t.name.toLowerCase().includes(query.toLowerCase())
  );
  const trimmed = query.trim();
  const canCreate = trimmed && !allTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());

  async function addTag(tagId: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
      const data = await res.json();
      if (data.tags) onTagsChange(data.tags);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  async function createAndAdd() {
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.tags) onTagsChange(data.tags);
      onTagCreated(); // refresh sidebar tag list
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Add tag"
      >
        <Plus className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-md shadow-lg z-50">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create tag…"
            className="w-full px-3 py-2 text-xs border-b border-border bg-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (canCreate) createAndAdd();
                else if (filtered.length === 1) addTag(filtered[0].id);
              }
              if (e.key === 'Escape') setOpen(false);
            }}
          />
          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.map((tag) => (
              <button
                key={tag.id}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 transition-colors"
                onClick={() => addTag(tag.id)}
              >
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </button>
            ))}
            {canCreate && (
              <button
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent text-muted-foreground transition-colors"
                onClick={createAndAdd}
              >
                Create &ldquo;{trimmed}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                {allTags.length === 0 ? 'Type to create your first tag' : 'All tags already applied'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reading Pane ─────────────────────────────────────────────────────────────

export function ReadingPane({
  article,
  onToggleStar,
  onToggleRead,
  lmStudioConfig,
  allTags,
  onTagsChange,
  onTagCreated,
}: ReadingPaneProps) {
  const [sanitizedContent, setSanitizedContent] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (article?.content) {
      setSanitizedContent(sanitizeHtml(article.content));
    } else {
      setSanitizedContent('');
    }
    setSummary(null);
    setSummaryError(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [article?.id, article?.content]);

  async function handleSummarize() {
    if (!article) return;
    setSummarizing(true);
    setSummaryError(null);
    setSummary(null);
    try {
      const res = await fetch(`/api/articles/${article.id}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: lmStudioConfig.baseUrl, model: lmStudioConfig.model }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setSummaryError(data.error || 'Summarization failed');
      else setSummary(data.summary);
    } catch {
      setSummaryError('Network error — could not reach the server');
    } finally {
      setSummarizing(false);
    }
  }

  async function removeTag(tagId: number) {
    if (!article) return;
    const res = await fetch(`/api/articles/${article.id}/tags/${tagId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.tags) onTagsChange(article.id, data.tags);
  }

  if (!article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-12 w-12" />
        <p className="text-sm">Select an article to read</p>
        <p className="text-xs">Use j/k to navigate, Enter to open</p>
      </div>
    );
  }

  const articleTags = article.tags || [];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Article header */}
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <h1 className="text-xl font-bold leading-tight mb-2">{article.title}</h1>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            {article.feed_favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.feed_favicon}
                alt=""
                className="h-4 w-4 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <span className="truncate">{article.feed_title}</span>
            {article.author && <><span className="flex-shrink-0">·</span><span className="truncate">{article.author}</span></>}
            {article.published_at && <><span className="flex-shrink-0">·</span><span className="flex-shrink-0">{formatDate(article.published_at)}</span></>}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 gap-1 text-xs', summarizing && 'opacity-70 cursor-not-allowed')}
              onClick={handleSummarize}
              disabled={summarizing}
              title="Summarize with local LLM"
            >
              <Sparkles className={cn('h-3.5 w-3.5', summarizing && 'animate-pulse')} />
              {summarizing ? 'Summarizing…' : 'Summarize'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onToggleStar(article)} title={article.is_starred ? 'Unstar' : 'Star'}>
              <Star className={cn('h-4 w-4', article.is_starred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onToggleRead(article)} title={article.is_read ? 'Mark as unread' : 'Mark as read'}>
              <BookOpen className={cn('h-4 w-4', article.is_read ? 'text-muted-foreground' : 'text-primary')} />
            </Button>
            {article.link && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
                <a href={article.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open original
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
          {articleTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full leading-none"
              style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}50` }}
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-70 transition-opacity"
                title={`Remove tag "${tag.name}"`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <TagPicker
            articleId={article.id}
            articleTags={articleTags}
            allTags={allTags}
            onTagsChange={(tags) => onTagsChange(article.id, tags)}
            onTagCreated={onTagCreated}
          />
        </div>
      </div>

      {/* Article content */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-6 max-w-3xl mx-auto">

          {/* Summary card */}
          {(summary || summaryError) && (
            <div className={cn(
              'mb-6 rounded-lg border p-4 relative',
              summaryError ? 'border-destructive/40 bg-destructive/5' : 'border-primary/20 bg-primary/5'
            )}>
              <div className="flex items-center gap-2 mb-2">
                {summaryError
                  ? <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  : <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                }
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {summaryError ? 'Summary error' : 'AI Summary'}
                </span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => { setSummary(null); setSummaryError(null); }} title="Dismiss">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {summaryError
                ? <p className="text-sm text-destructive">{summaryError}</p>
                : <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{summary}</p>
              }
            </div>
          )}

          {sanitizedContent ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-md prose-img:max-w-full
                prose-pre:bg-muted prose-pre:text-sm
                prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No content available.</p>
              {article.link && (
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 inline-block">
                  Read on original site →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
