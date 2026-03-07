'use client';

import { useState } from 'react';
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
import { type LayoutMode, DEFAULT_LAYOUT, saveLayout } from '@/lib/layout';
import { cn } from '@/lib/utils';

interface SettingsPaneProps {
  onClose: () => void;
  keybindings: Keybindings;
  onKeybindingsChange: (kb: Keybindings) => void;
  lmStudioConfig: LMStudioConfig;
  onLMStudioConfigChange: (config: LMStudioConfig) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
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

export function SettingsPane({
  onClose,
  keybindings,
  onKeybindingsChange,
  lmStudioConfig,
  onLMStudioConfigChange,
  layoutMode,
  onLayoutModeChange,
}: SettingsPaneProps) {
  const [draft, setDraft] = useState<Keybindings>(keybindings ?? DEFAULT_KEYBINDINGS);
  const [lmDraft, setLmDraft] = useState<LMStudioConfig>(lmStudioConfig ?? DEFAULT_LMSTUDIO_CONFIG);
  const [layoutDraft, setLayoutDraft] = useState<LayoutMode>(layoutMode ?? DEFAULT_LAYOUT);

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
    saveLayout(layoutDraft);
    onLayoutModeChange(layoutDraft);
    onClose();
  }

  function handleReset() {
    setDraft(DEFAULT_KEYBINDINGS);
    setLmDraft(DEFAULT_LMSTUDIO_CONFIG);
    setLayoutDraft(DEFAULT_LAYOUT);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <div className="flex-shrink-0 h-12 flex items-center px-6 border-b border-border">
        <h2 className="font-semibold text-sm">Settings</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg px-6 py-4 space-y-1">

          {/* Layout */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
            Layout
          </p>
          <div className="flex gap-3 py-2">
            {([
              {
                mode: '3-panel' as LayoutMode,
                label: '3-panel',
                desc: 'Sidebar · List · Reader',
                preview: (
                  <div className="flex gap-0.5 h-8 w-20">
                    <div className="w-4 rounded-sm bg-muted" />
                    <div className="w-6 rounded-sm bg-muted" />
                    <div className="flex-1 rounded-sm bg-muted" />
                  </div>
                ),
              },
              {
                mode: '2-panel' as LayoutMode,
                label: '2-panel',
                desc: 'Sidebar · List or Reader',
                preview: (
                  <div className="flex gap-0.5 h-8 w-20">
                    <div className="w-4 rounded-sm bg-muted" />
                    <div className="flex-1 rounded-sm bg-muted" />
                  </div>
                ),
              },
            ] as const).map(({ mode, label, desc, preview }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLayoutDraft(mode)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors',
                  layoutDraft === mode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/40',
                )}
              >
                {preview}
                <span className="font-medium">{label}</span>
                <span className="text-[10px] opacity-70">{desc}</span>
              </button>
            ))}
          </div>

          {/* Keyboard shortcuts */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">
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
      </div>

      {/* Sticky footer */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-border">
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
          Reset to defaults
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
