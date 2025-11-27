export interface LocaleForgeAPI {
  openProject(): Promise<string | null>;
  openLanguageDirectory(): Promise<string | null>;
  listProjectFolders(payload: { root: string; path?: string }): Promise<{ children: DirectoryNode[] }>;
  autoDetectLanguageDirectory(payload: { projectPath: string }): Promise<string | null>;
  listLanguageFiles(payload: { directory: string }): Promise<{ files: LanguageFileSummary[] }>;
  createLanguageFile(payload: { directory: string; code: string }): Promise<{ path: string }>;
  openLanguageFile(): Promise<string | null>;
  scanProject(params: {
    rootPath: string;
    extensions: string[];
    ignore: string[];
    directories?: string[];
  }): Promise<{ candidates: CandidateString[] }>;
  loadLanguageFile(path: string): Promise<{ data: any }>;
  saveLanguageFile(payload: { path: string; data: any }): Promise<{ success: boolean }>;
  showItemInFolder(path: string): void;
  getTranslationSettings(): Promise<TranslationSettings | null>;
  saveTranslationSettings(value: TranslationSettings | null): Promise<TranslationSettings | null>;
  runTranslationSync(payload: { basePath: string; languageDir: string }): Promise<TranslationSyncResult>;
  listTranslationModels(payload: { provider: TranslationSettings['provider']; apiKey: string; apiUrl?: string }): Promise<string[]>;
  onTranslationProgress(callback: (event: TranslationProgressEvent) => void): () => void;
}

type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
};

type LanguageFileSummary = {
  name: string;
  path: string;
};

type DirectoryNode = {
  name: string;
  path: string;
  hasChildren: boolean;
};

type TranslationSettings = {
  provider: 'deepl' | 'google' | 'openai';
  apiKey: string;
  apiUrl?: string;
  region?: string;
  model?: string;
  targetLocales?: string[];
};

type TranslationSyncResult = {
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

type TranslationProgressEvent = {
  locale: string;
  status: 'pending' | 'updated' | 'skipped' | 'error';
  translated?: number;
  total?: number;
  message?: string;
  error?: string;
};

declare global {
  interface Window {
    api: LocaleForgeAPI;
  }
}
