'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Star, Inbox, Rss, Folder, Plus, CircleDot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

export interface TagItem {
  id: number;
  name: string;
  color: string;
  article_count: number;
}

type Selection =
  | { type: 'all' }
  | { type: 'unread' }
  | { type: 'starred' }
  | { type: 'folder'; id: number }
  | { type: 'feed'; id: number }
  | { type: 'tag'; id: number };

interface SidebarProps {
  feeds: Feed[];
  folders: Folder[];
  tags: TagItem[];
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onDataChange: () => void;
  onTagsChange: () => void;
}

export function Sidebar({ feeds = [], folders = [], tags = [], selection, onSelect, onDataChange, onTagsChange }: SidebarProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);

  // Collapse all folders on first load
  useEffect(() => {
    if (!initializedRef.current && folders.length > 0) {
      initializedRef.current = true;
      setCollapsedFolders(new Set(folders.map((f) => f.id)));
    }
  }, [folders]);

  const [renamingFolder, setRenamingFolder] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingTag, setRenamingTag] = useState<number | null>(null);
  const [renameTagValue, setRenameTagValue] = useState('');

  const totalUnread = feeds.reduce((sum, f) => sum + (f.unread_count || 0), 0);

  function toggleFolder(id: number) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isSelected(sel: Selection) {
    if (selection.type !== sel.type) return false;
    if (sel.type === 'all' || sel.type === 'unread' || sel.type === 'starred') return true;
    if (sel.type === 'folder' && selection.type === 'folder') return selection.id === sel.id;
    if (sel.type === 'feed' && selection.type === 'feed') return selection.id === sel.id;
    if (sel.type === 'tag' && selection.type === 'tag') return selection.id === sel.id;
    return false;
  }

  async function deleteFolder(id: number) {
    const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onDataChange();
      if (selection.type === 'folder' && selection.id === id) onSelect({ type: 'all' });
    } else {
      toast.error('Failed to delete folder');
    }
  }

  async function renameFolder(id: number) {
    if (!renameValue.trim()) return;
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) onDataChange(); else toast.error('Failed to rename folder');
    setRenamingFolder(null);
    setRenameValue('');
  }

  async function deleteFeed(id: number) {
    const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onDataChange();
      if (selection.type === 'feed' && selection.id === id) onSelect({ type: 'all' });
    } else {
      toast.error('Failed to delete feed');
    }
  }

  async function moveFeedToFolder(feedId: number, folderId: number | null) {
    await fetch(`/api/feeds/${feedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    });
    onDataChange();
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (res.ok) onDataChange(); else toast.error('Failed to create folder');
    setNewFolderMode(false);
    setNewFolderName('');
  }

  async function deleteTag(id: number) {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      onTagsChange();
      if (selection.type === 'tag' && selection.id === id) onSelect({ type: 'all' });
    } else {
      toast.error('Failed to delete tag');
    }
  }

  async function renameTag(id: number) {
    if (!renameTagValue.trim()) return;
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameTagValue.trim() }),
    });
    if (res.ok) onTagsChange(); else toast.error('Failed to rename tag');
    setRenamingTag(null);
    setRenameTagValue('');
  }

  const feedsInFolder = (folderId: number) => feeds.filter((f) => f.folder_id === folderId);
  const uncategorizedFeeds = feeds.filter((f) => f.folder_id === null);
  const unreadInFolder = (folderId: number) =>
    feedsInFolder(folderId).reduce((sum, f) => sum + (f.unread_count || 0), 0);

  return (
    <div className="w-60 flex-shrink-0 border-r border-border flex flex-col h-full bg-card overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        {/* Fixed items */}
        <div className="px-2 space-y-0.5">
          <button
            onClick={() => onSelect({ type: 'unread' })}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
              isSelected({ type: 'unread' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
            )}
          >
            <CircleDot className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Unread</span>
            {totalUnread > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {totalUnread > 999 ? '999+' : totalUnread}
              </Badge>
            )}
          </button>

          <button
            onClick={() => onSelect({ type: 'starred' })}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
              isSelected({ type: 'starred' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
            )}
          >
            <Star className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Starred</span>
          </button>

          <button
            onClick={() => onSelect({ type: 'all' })}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
              isSelected({ type: 'all' }) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
            )}
          >
            <Inbox className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">All Items</span>
          </button>
        </div>

        <div className="mx-2 my-2 border-t border-border" />

        {/* Folders */}
        <div className="px-2 space-y-0.5">
          {folders.map((folder) => (
            <div key={folder.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div>
                    {renamingFolder === folder.id ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => renameFolder(folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameFolder(folder.id);
                          if (e.key === 'Escape') { setRenamingFolder(null); setRenameValue(''); }
                        }}
                        className="h-7 text-sm px-2"
                      />
                    ) : (
                      <button
                        onClick={() => { toggleFolder(folder.id); onSelect({ type: 'folder', id: folder.id }); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                          isSelected({ type: 'folder', id: folder.id })
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50 text-foreground'
                        )}
                      >
                        <Folder className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        {unreadInFolder(folder.id) > 0 && (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">
                            {unreadInFolder(folder.id)}
                          </Badge>
                        )}
                        {collapsedFolders.has(folder.id)
                          ? <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          : <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        }
                      </button>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => { setRenamingFolder(folder.id); setRenameValue(folder.name); }}>
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem className="text-destructive" onClick={() => deleteFolder(folder.id)}>
                    Delete Folder
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>

              {!collapsedFolders.has(folder.id) && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                  {feedsInFolder(folder.id).map((feed) => (
                    <FeedItem
                      key={feed.id}
                      feed={feed}
                      selected={isSelected({ type: 'feed', id: feed.id })}
                      onSelect={() => onSelect({ type: 'feed', id: feed.id })}
                      onDelete={() => deleteFeed(feed.id)}
                      folders={folders}
                      onMove={(folderId) => moveFeedToFolder(feed.id, folderId)}
                    />
                  ))}
                  {feedsInFolder(folder.id).length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-1">Empty</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Uncategorized feeds */}
        {uncategorizedFeeds.length > 0 && (
          <>
            {folders.length > 0 && <div className="mx-2 my-2 border-t border-border" />}
            <div className="px-2 space-y-0.5">
              {uncategorizedFeeds.map((feed) => (
                <FeedItem
                  key={feed.id}
                  feed={feed}
                  selected={isSelected({ type: 'feed', id: feed.id })}
                  onSelect={() => onSelect({ type: 'feed', id: feed.id })}
                  onDelete={() => deleteFeed(feed.id)}
                  folders={folders}
                  onMove={(folderId) => moveFeedToFolder(feed.id, folderId)}
                />
              ))}
            </div>
          </>
        )}

        {/* Tags section */}
        {tags.length > 0 && (
          <>
            <div className="mx-2 my-2 border-t border-border" />
            <div className="px-2 space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-1">
                Tags
              </p>
              {tags.map((tag) => (
                <ContextMenu key={tag.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      {renamingTag === tag.id ? (
                        <Input
                          autoFocus
                          value={renameTagValue}
                          onChange={(e) => setRenameTagValue(e.target.value)}
                          onBlur={() => renameTag(tag.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameTag(tag.id);
                            if (e.key === 'Escape') { setRenamingTag(null); setRenameTagValue(''); }
                          }}
                          className="h-7 text-sm px-2"
                        />
                      ) : (
                        <button
                          onClick={() => onSelect({ type: 'tag', id: tag.id })}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                            isSelected({ type: 'tag', id: tag.id })
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50 text-foreground'
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1 text-left truncate">{tag.name}</span>
                          {tag.article_count > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {tag.article_count > 99 ? '99+' : tag.article_count}
                            </Badge>
                          )}
                        </button>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => { setRenamingTag(tag.id); setRenameTagValue(tag.name); }}>
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem className="text-destructive" onClick={() => deleteTag(tag.id)}>
                      Delete Tag
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {feeds.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Rss className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No feeds yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add Feed" to get started</p>
          </div>
        )}
      </div>

      {/* New folder button */}
      <div className="p-2 border-t border-border">
        {newFolderMode ? (
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={createFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createFolder();
              if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName(''); }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setNewFolderMode(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Folder
          </Button>
        )}
      </div>
    </div>
  );
}

interface FeedItemProps {
  feed: Feed;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  folders: Folder[];
  onMove: (folderId: number | null) => void;
}

function FeedItem({ feed, selected, onSelect, onDelete, folders, onMove }: FeedItemProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onSelect}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
            selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-foreground'
          )}
        >
          {feed.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={feed.favicon_url}
              alt=""
              className="h-4 w-4 flex-shrink-0 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Rss className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 text-left truncate">{feed.title || feed.url}</span>
          {feed.unread_count > 0 && (
            <Badge variant="secondary" className="text-xs h-5 px-1.5 flex-shrink-0">
              {feed.unread_count > 99 ? '99+' : feed.unread_count}
            </Badge>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {folders.length > 0 && (
          <>
            <ContextMenuItem disabled className="text-xs text-muted-foreground">Move to folder</ContextMenuItem>
            <ContextMenuItem onClick={() => onMove(null)}>Uncategorized</ContextMenuItem>
            {folders.map((f) => (
              <ContextMenuItem key={f.id} onClick={() => onMove(f.id)}>{f.name}</ContextMenuItem>
            ))}
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem className="text-destructive" onClick={onDelete}>Remove Feed</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

