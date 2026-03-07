'use client';

import { useState, useRef } from 'react';
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
import { Sliders, Keyboard, Sparkles, FolderOpen, Upload, Download } from 'lucide-react';
import {
  type Keybindings,
  KEY_OPTIONS,
  saveKeybindings,
} from '@/lib/keybindings';
import {
  type LMStudioConfig,
  DEFAULT_LMSTUDIO_CONFIG,
  saveLMStudioConfig,
} from '@/lib/lmstudio';
import { type LayoutMode, saveLayout } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Section = 'general' | 'shortcuts' | 'ai' | 'data';

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Sliders },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'data', label: 'Data', icon: FolderOpen },
];

interface SettingsPaneProps {
  keybindings: Keybindings;
  onKeybindingsChange: (kb: Keybindings) => void;
  lmStudioConfig: LMStudioConfig;
  onLMStudioConfigChange: (config: LMStudioConfig) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  onDataChange: () => void;
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
  keybindings,
  onKeybindingsChange,
  lmStudioConfig,
  onLMStudioConfigChange,
  layoutMode,
  onLayoutModeChange,
  onDataChange,
}: SettingsPaneProps) {
  const [activeSection, setActiveSection] = useState<Section>('general');
  const [lmDraft, setLmDraft] = useState<LMStudioConfig>(lmStudioConfig ?? DEFAULT_LMSTUDIO_CONFIG);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateBinding(field: keyof Keybindings, value: string) {
    const updated = { ...keybindings, [field]: value };
    saveKeybindings(updated);
    onKeybindingsChange(updated);
  }

  function updateLayout(mode: LayoutMode) {
    saveLayout(mode);
    onLayoutModeChange(mode);
  }

  function updateLm(field: keyof LMStudioConfig, value: string) {
    setLmDraft((prev) => {
      const updated = { ...prev, [field]: value };
      saveLMStudioConfig(updated);
      onLMStudioConfigChange(updated);
      return updated;
    });
  }

  function handleExport() {
    const a = document.createElement('a');
    a.href = '/api/opml';
    a.download = '';
    a.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const parts: string[] = [];
      if (feedsAdded > 0) parts.push(`${feedsAdded} feed${feedsAdded !== 1 ? 's' : ''} added`);
      if (foldersCreated > 0) parts.push(`${foldersCreated} folder${foldersCreated !== 1 ? 's' : ''} created`);
      if (feedsSkipped > 0) parts.push(`${feedsSkipped} already existed`);
      const msg = parts.length > 0 ? parts.join(', ') : 'Nothing new to import';
      toast.success(msg, { id: loadingId });
      if (feedsAdded > 0) {
        onDataChange();
        toast.info('Click "Refresh All" to fetch articles for new feeds');
      }
    } catch {
      toast.error('Import failed — check the file format', { id: loadingId });
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <div className="flex-shrink-0 h-12 flex items-center px-6 border-b border-border">
        <h2 className="font-semibold text-sm">Settings</h2>
      </div>

      {/* Body: section nav + content */}
      <div className="flex flex-1 min-h-0">
        {/* Section nav */}
        <div className="w-40 flex-shrink-0 border-r border-border py-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                activeSection === id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-lg px-6 py-4 space-y-1">

            {activeSection === 'general' && (
              <>
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
                      onClick={() => updateLayout(mode)}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors',
                        layoutMode === mode
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
              </>
            )}

            {activeSection === 'shortcuts' && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                  Keyboard Shortcuts
                </p>
                <div className="divide-y divide-border">
                  <BindingRow
                    label="Next article"
                    description="Move to the next article in the list"
                    field="nextArticle"
                    value={keybindings.nextArticle}
                    options={KEY_OPTIONS.nextArticle}
                    onChange={(v) => updateBinding('nextArticle', v)}
                  />
                  <BindingRow
                    label="Previous article"
                    description="Move to the previous article in the list"
                    field="prevArticle"
                    value={keybindings.prevArticle}
                    options={KEY_OPTIONS.prevArticle}
                    onChange={(v) => updateBinding('prevArticle', v)}
                  />
                  <BindingRow
                    label="Open original"
                    description="Open the article in your browser"
                    field="openOriginal"
                    value={keybindings.openOriginal}
                    options={KEY_OPTIONS.openOriginal}
                    onChange={(v) => updateBinding('openOriginal', v)}
                  />
                  <BindingRow
                    label="Star article"
                    description="Toggle the star on the current article"
                    field="starArticle"
                    value={keybindings.starArticle}
                    options={KEY_OPTIONS.starArticle}
                    onChange={(v) => updateBinding('starArticle', v)}
                  />
                  <BindingRow
                    label="Toggle read"
                    description="Mark the current article as read or unread"
                    field="toggleRead"
                    value={keybindings.toggleRead}
                    options={KEY_OPTIONS.toggleRead}
                    onChange={(v) => updateBinding('toggleRead', v)}
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Enter always opens · r always refreshes · ? always shows shortcuts
                </p>
              </>
            )}

            {activeSection === 'ai' && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
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
              </>
            )}

            {activeSection === 'data' && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                  Import / Export
                </p>
                <div className="space-y-6 pt-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Export OPML</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Download all your feeds and folders as an OPML file, compatible with most RSS readers.
                    </p>
                    <Button size="sm" variant="outline" onClick={handleExport} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export OPML
                    </Button>
                  </div>

                  <div className="border-t border-border" />

                  <div>
                    <p className="text-sm font-medium mb-1">Import OPML</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Import feeds and folders from an OPML file exported from another RSS reader.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="h-4 w-4" />
                      Import OPML…
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".opml,.xml"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
