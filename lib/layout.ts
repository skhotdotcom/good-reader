export type LayoutMode = '3-panel' | '2-panel';

const KEY = 'good-reader-layout';
export const DEFAULT_LAYOUT: LayoutMode = '3-panel';

export function loadLayout(): LayoutMode {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  return (localStorage.getItem(KEY) as LayoutMode) ?? DEFAULT_LAYOUT;
}

export function saveLayout(mode: LayoutMode) {
  localStorage.setItem(KEY, mode);
}
