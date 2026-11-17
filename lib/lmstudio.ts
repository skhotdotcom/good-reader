export type AIProtocol = 'lmstudio' | 'openai' | 'anthropic';

export interface LMStudioConfig {
  protocol: AIProtocol;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const PROTOCOL_DEFAULTS: Record<AIProtocol, LMStudioConfig> = {
  lmstudio: {
    protocol: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    apiKey: '',
  },
  openai: {
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
  },
  anthropic: {
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-4-5-20251001',
    apiKey: '',
  },
};

export const DEFAULT_LMSTUDIO_CONFIG: LMStudioConfig = PROTOCOL_DEFAULTS.lmstudio;

export function loadLMStudioConfig(): LMStudioConfig {
  if (typeof window === 'undefined') return DEFAULT_LMSTUDIO_CONFIG;
  try {
    const saved = localStorage.getItem('good-reader-lmstudio');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format (no protocol or apiKey fields)
      if (!parsed.protocol) parsed.protocol = 'lmstudio';
      if (!parsed.apiKey) parsed.apiKey = '';
      return { ...DEFAULT_LMSTUDIO_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_LMSTUDIO_CONFIG;
}

export function saveLMStudioConfig(config: LMStudioConfig) {
  try {
    localStorage.setItem('good-reader-lmstudio', JSON.stringify(config));
  } catch {}
}
