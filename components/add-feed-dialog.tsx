'use client';

import { useState } from 'react';
import { Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Folder {
  id: number;
  name: string;
}

interface AddFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  onFeedAdded: () => void;
}

interface DiscoveredFeed {
  url: string;
  title: string;
  type: string;
}

function looksLikeFeedUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return /\.(xml|rss|atom)$/i.test(pathname) || /\/(feed|rss|atom)(\/|$)/i.test(pathname);
  } catch {
    return false;
  }
}

export function AddFeedDialog({ open, onOpenChange, folders, onFeedAdded }: AddFeedDialogProps) {
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredFeed | null>(null);

  function reset() {
    setUrl('');
    setFolderId('');
    setDiscoveredFeeds([]);
    setSelectedDiscovered(null);
  }

  async function handleUrlBlur() {
    const trimmed = url.trim();
    if (!trimmed || looksLikeFeedUrl(trimmed)) return;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return;
    }
    if (!parsed.protocol.startsWith('http')) return;

    setDiscovering(true);
    setDiscoveredFeeds([]);
    setSelectedDiscovered(null);
    try {
      const res = await fetch('/api/feeds/discover?url=' + encodeURIComponent(trimmed));
      const data = await res.json();
      const feeds: DiscoveredFeed[] = data.feeds || [];
      setDiscoveredFeeds(feeds);
      if (feeds.length === 1) {
        setSelectedDiscovered(feeds[0]);
      }
    } catch {
      // silently ignore — user can still submit the URL directly
    } finally {
      setDiscovering(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const feedUrl = selectedDiscovered?.url || url.trim();
    if (!feedUrl) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: feedUrl,
          folder_id: folderId && folderId !== 'none' ? parseInt(folderId) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to add feed');
        return;
      }

      toast.success(`Added "${data.title || feedUrl}"`);
      reset();
      onOpenChange(false);
      onFeedAdded();
    } catch {
      toast.error('Network error — could not add feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Feed</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feed-url">Feed or Site URL</Label>
            <Input
              id="feed-url"
              type="url"
              placeholder="https://example.com or https://example.com/feed.xml"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setDiscoveredFeeds([]);
                setSelectedDiscovered(null);
              }}
              onBlur={handleUrlBlur}
              disabled={loading}
              autoFocus
            />
            {discovering && (
              <p className="text-xs text-muted-foreground">Looking for feeds…</p>
            )}
            {!discovering && discoveredFeeds.length > 0 && (
              <div className="rounded-md border border-border divide-y divide-border">
                {discoveredFeeds.map((feed) => (
                  <button
                    key={feed.url}
                    type="button"
                    onClick={() => setSelectedDiscovered(feed)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      selectedDiscovered?.url === feed.url
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <Rss className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{feed.title || feed.url}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {feed.type.includes('atom') ? 'Atom' : 'RSS'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!discovering && url.trim() && discoveredFeeds.length === 0 && selectedDiscovered === null && (
              null
            )}
          </div>
          {folders.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="folder">Folder (optional)</Label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Uncategorized" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!url.trim() && !selectedDiscovered)}>
              {loading ? 'Adding…' : 'Add Feed'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
