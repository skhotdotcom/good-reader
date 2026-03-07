'use client';

import { Plus, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  onAddFeed: () => void;
}

export function TopBar({ onAddFeed }: TopBarProps) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-2">
        <Rss className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Good Reader</span>
      </div>

      <Button size="sm" onClick={onAddFeed} className="gap-1.5 text-xs">
        <Plus className="h-3.5 w-3.5" />
        Add Feed
      </Button>
    </div>
  );
}
