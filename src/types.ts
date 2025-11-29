export type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
  keySuggestion?: string;
  include?: boolean;
  localized?: boolean;
  keyPath?: string;
};

export type LanguageEntry = {
  key: string;
  text: string;
  status: 'new' | 'existing';
};

export type KeyValuePair = {
  key: string;
  value: unknown;
};

export type TranslationSettings = {
  provider: 'deepl' | 'google' | 'openai';
  apiKey: string;
  apiUrl?: string;
  model?: string;
  region?: string;
  targetLocales?: string[];
};

export type TranslationSyncResult = {
  updatedFiles: number;
  translatedKeys: number;
  skippedFiles: number;
  details: Array<{
    locale: string;
    path: string;
    translated: number;
    status: 'updated' | 'skipped' | 'error';
    error?: string;
  }>;
};

export type TranslationProgressEvent = {
  locale: string;
  status: 'pending' | 'updated' | 'skipped' | 'error';
  translated?: number;
  total?: number;
  message?: string;
  error?: string;
};
