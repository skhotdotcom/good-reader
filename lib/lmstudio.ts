export interface LMStudioConfig {
  baseUrl: string;
  model: string;
}

export const DEFAULT_LMSTUDIO_CONFIG: LMStudioConfig = {
  baseUrl: 'http://localhost:1234/v1',
  model: 'local-model',
};

export function loadLMStudioConfig(): LMStudioConfig {
  if (typeof window === 'undefined') return DEFAULT_LMSTUDIO_CONFIG;
  try {
    const saved = localStorage.getItem('good-reader-lmstudio');
    if (saved) return { ...DEFAULT_LMSTUDIO_CONFIG, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_LMSTUDIO_CONFIG;
}

export function saveLMStudioConfig(config: LMStudioConfig) {
  try {
    localStorage.setItem('good-reader-lmstudio', JSON.stringify(config));
  } catch {}
}
