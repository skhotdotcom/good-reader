'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Keybindings,
  DEFAULT_KEYBINDINGS,
  KEY_OPTIONS,
  saveKeybindings,
} from '@/lib/keybindings';
import {
  type LMStudioConfig,
  DEFAULT_LMSTUDIO_CONFIG,
  saveLMStudioConfig,
} from '@/lib/lmstudio';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keybindings: Keybindings;
  onKeybindingsChange: (kb: Keybindings) => void;
  lmStudioConfig: LMStudioConfig;
  onLMStudioConfigChange: (config: LMStudioConfig) => void;
}

interface BindingRowProps {
  label: string;
  description: string;
  field: keyof Keybindings;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function BindingRow({ label, description, field: _field, value, options, onChange }: BindingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44 h-8 text-sm font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  keybindings,
  onKeybindingsChange,
  lmStudioConfig,
  onLMStudioConfigChange,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<Keybindings>(keybindings ?? DEFAULT_KEYBINDINGS);
  const [lmDraft, setLmDraft] = useState<LMStudioConfig>(lmStudioConfig ?? DEFAULT_LMSTUDIO_CONFIG);

  function handleOpenChange(v: boolean) {
    if (v) {
      setDraft(keybindings ?? DEFAULT_KEYBINDINGS);
      setLmDraft(lmStudioConfig ?? DEFAULT_LMSTUDIO_CONFIG);
    }
    onOpenChange(v);
  }

  function update(field: keyof Keybindings, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function updateLm(field: keyof LMStudioConfig, value: string) {
    setLmDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    saveKeybindings(draft);
    onKeybindingsChange(draft);
    saveLMStudioConfig(lmDraft);
    onLMStudioConfigChange(lmDraft);
    onOpenChange(false);
  }

  function handleReset() {
    setDraft(DEFAULT_KEYBINDINGS);
    setLmDraft(DEFAULT_LMSTUDIO_CONFIG);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {/* Keyboard shortcuts */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
            Keyboard Shortcuts
          </p>
          <div className="divide-y divide-border">
            <BindingRow
              label="Next article"
              description="Move to the next article in the list"
              field="nextArticle"
              value={draft.nextArticle}
              options={KEY_OPTIONS.nextArticle}
              onChange={(v) => update('nextArticle', v)}
            />
            <BindingRow
              label="Previous article"
              description="Move to the previous article in the list"
              field="prevArticle"
              value={draft.prevArticle}
              options={KEY_OPTIONS.prevArticle}
              onChange={(v) => update('prevArticle', v)}
            />
            <BindingRow
              label="Open original"
              description="Open the article in your browser"
              field="openOriginal"
              value={draft.openOriginal}
              options={KEY_OPTIONS.openOriginal}
              onChange={(v) => update('openOriginal', v)}
            />
            <BindingRow
              label="Star article"
              description="Toggle the star on the current article"
              field="starArticle"
              value={draft.starArticle}
              options={KEY_OPTIONS.starArticle}
              onChange={(v) => update('starArticle', v)}
            />
            <BindingRow
              label="Toggle read"
              description="Mark the current article as read or unread"
              field="toggleRead"
              value={draft.toggleRead}
              options={KEY_OPTIONS.toggleRead}
              onChange={(v) => update('toggleRead', v)}
            />
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Enter always opens · r always refreshes · ? always shows shortcuts
          </p>

          {/* LM Studio */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-5">
            AI Summarization — LM Studio
          </p>
          <p className="text-xs text-muted-foreground pb-2">
            Requires LM Studio running locally with a model loaded.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Server URL</Label>
              <Input
                className="h-8 text-sm font-mono"
                value={lmDraft.baseUrl}
                onChange={(e) => updateLm('baseUrl', e.target.value)}
                placeholder="http://localhost:1234/v1"
              />
              <p className="text-xs text-muted-foreground">
                LM Studio's local server address (default: port 1234)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Model name</Label>
              <Input
                className="h-8 text-sm font-mono"
                value={lmDraft.model}
                onChange={(e) => updateLm('model', e.target.value)}
                placeholder="local-model"
              />
              <p className="text-xs text-muted-foreground">
                Must match the model identifier shown in LM Studio
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
            Reset to defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
