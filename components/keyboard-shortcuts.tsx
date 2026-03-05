'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type Keybindings, keyLabel } from '@/lib/keybindings';

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground border border-border"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keybindings: Keybindings;
}

export function KeyboardShortcutsDialog({ open, onOpenChange, keybindings }: KeyboardShortcutsDialogProps) {
  const kb = keybindings;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          <ShortcutRow keys={[keyLabel(kb.nextArticle)]} description="Next article" />
          <ShortcutRow keys={[keyLabel(kb.prevArticle)]} description="Previous article" />
          <ShortcutRow keys={['Enter', keyLabel(kb.openOriginal)]} description="Open selected article" />
          <ShortcutRow keys={[keyLabel(kb.starArticle)]} description="Toggle star" />
          <ShortcutRow keys={[keyLabel(kb.toggleRead)]} description="Toggle read / unread" />
          <ShortcutRow keys={['r']} description="Refresh all feeds" />
          <ShortcutRow keys={['?']} description="Show this help dialog" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
