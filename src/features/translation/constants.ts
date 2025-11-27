import type { TranslationSettings } from '../../types';

export type TranslationProviderConfig = {
  label: string;
  endpointLabel: string;
  endpointPlaceholder: string;
  showModel: boolean;
  defaultApiUrl?: string;
  defaultModel?: string;
};

export const TRANSLATION_PROVIDER_CONFIGS: Record<TranslationSettings['provider'], TranslationProviderConfig> = {
  deepl: {
    label: 'DeepL',
    endpointLabel: 'API endpoint (optional)',
    endpointPlaceholder: 'https://api-free.deepl.com',
    showModel: false,
    defaultApiUrl: 'https://api-free.deepl.com',
    defaultModel: undefined,
  },
  google: {
    label: 'Google Cloud Translate',
    endpointLabel: 'API endpoint (optional)',
    endpointPlaceholder: 'https://translation.googleapis.com',
    showModel: false,
    defaultApiUrl: 'https://translation.googleapis.com',
    defaultModel: undefined,
  },
  openai: {
    label: 'OpenAI',
    endpointLabel: 'API base URL (optional)',
    endpointPlaceholder: 'https://api.openai.com/v1',
    showModel: true,
    defaultApiUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
};

