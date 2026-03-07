'use client';

import { useRef } from 'react';
import { RefreshCw, Plus, Rss, Upload, Download, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TopBarProps {
  onAddFeed: () => void;
  onRefreshAll: () => void;
  refreshing: boolean;
  onDataChange: () => void;
}

export function TopBar({ onAddFeed, onRefreshAll, refreshing, onDataChange }: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    // Trigger a download by navigating to the export endpoint
    const a = document.createElement('a');
    a.href = '/api/opml';
    a.download = '';
    a.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-imported if needed
    e.target.value = '';

    const formData = new FormData();
    formData.append('file', file);

    const loadingId = toast.loading('Importing OPML…');
    try {
      const res = await fetch('/api/opml', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Import failed', { id: loadingId });
        return;
      }

      const { foldersCreated, feedsAdded, feedsSkipped } = data;
      const parts = [];
      if (feedsAdded > 0) parts.push(`${feedsAdded} feed${feedsAdded !== 1 ? 's' : ''} added`);
      if (foldersCreated > 0) parts.push(`${foldersCreated} folder${foldersCreated !== 1 ? 's' : ''} created`);
      if (feedsSkipped > 0) parts.push(`${feedsSkipped} already existed`);

      const msg = parts.length > 0 ? parts.join(', ') : 'Nothing new to import';
      toast.success(msg, { id: loadingId });

      if (feedsAdded > 0) {
        onDataChange();
        if (feedsAdded > 0) {
          toast.info('Click "Refresh All" to fetch articles for new feeds');
        }
      }
    } catch {
      toast.error('Import failed — check the file format', { id: loadingId });
    }
  }

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        <Rss className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Good Reader</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshAll}
          disabled={refreshing}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh All'}
        </Button>

        <Button size="sm" onClick={onAddFeed} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Feed
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">OPML</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import OPML…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export OPML
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hidden file input for OPML import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".opml,.xml"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    </div>
  );
}
