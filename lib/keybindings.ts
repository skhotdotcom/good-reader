export interface Keybindings {
  nextArticle: string;
  prevArticle: string;
  starArticle: string;
  openOriginal: string;
  toggleRead: string;
}

export const DEFAULT_KEYBINDINGS: Keybindings = {
  nextArticle: 'j',
  prevArticle: 'k',
  starArticle: 's',
  openOriginal: 'o',
  toggleRead: 'm',
};

export const KEY_OPTIONS: Record<keyof Keybindings, { value: string; label: string }[]> = {
  nextArticle: [
    { value: 'j', label: 'j  (default)' },
    { value: 'n', label: 'n' },
    { value: 'ArrowDown', label: '↓  Arrow Down' },
  ],
  prevArticle: [
    { value: 'k', label: 'k  (default)' },
    { value: 'p', label: 'p' },
    { value: 'ArrowUp', label: '↑  Arrow Up' },
  ],
  starArticle: [
    { value: 's', label: 's  (default)' },
    { value: 'f', label: 'f  — favorite' },
    { value: 'b', label: 'b  — bookmark' },
    { value: 'l', label: 'l  — like' },
  ],
  openOriginal: [
    { value: 'o', label: 'o  (default)' },
    { value: 'v', label: 'v  — view' },
    { value: 'x', label: 'x' },
    { value: 'g', label: 'g  — go' },
  ],
  toggleRead: [
    { value: 'm', label: 'm  (default)' },
    { value: 'u', label: 'u  — unread' },
    { value: 't', label: 't  — toggle' },
    { value: 'i', label: 'i  — ignore' },
  ],
};

const STORAGE_KEY = 'good-reader-keybindings';

export function loadKeybindings(): Keybindings {
  if (typeof window === 'undefined') return DEFAULT_KEYBINDINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_KEYBINDINGS;
    return { ...DEFAULT_KEYBINDINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_KEYBINDINGS;
  }
}

export function saveKeybindings(bindings: Keybindings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

/** Human-readable label for a key value */
export function keyLabel(value: string): string {
  if (value === 'ArrowDown') return '↓';
  if (value === 'ArrowUp') return '↑';
  if (value === 'Enter') return 'Enter';
  return value;
}
