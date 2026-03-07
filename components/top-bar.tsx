'use client';

import { RefreshCw, Plus, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onAddFeed: () => void;
  onRefreshAll: () => void;
  refreshing: boolean;
}

export function TopBar({ onAddFeed, onRefreshAll, refreshing }: TopBarProps) {
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
      </div>
    </div>
  );
}
