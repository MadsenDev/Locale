export interface LocrootAPI {
  openProject(): Promise<string | null>;
  openLanguageDirectory(defaultPath?: string): Promise<string | null>;
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
  applyTranslationPatch(payload: TranslationPatchPayload): Promise<{ success: boolean; path: string }>;
  checkDependency(payload: DependencyPayload): Promise<{ installed: boolean }>;
  installDependency(payload: DependencyPayload): Promise<{ installed: boolean }>;
  loadLanguageFile(path: string): Promise<{ data: any }>;
  saveLanguageFile(payload: { path: string; data: any }): Promise<{ success: boolean }>;
  showItemInFolder(path: string): void;
  getTranslationSettings(): Promise<TranslationSettings | null>;
  saveTranslationSettings(value: TranslationSettings | null): Promise<TranslationSettings | null>;
  runTranslationSync(payload: { basePath: string; languageDir: string }): Promise<TranslationSyncResult>;
  listTranslationModels(payload: { provider: TranslationSettings['provider']; apiKey: string; apiUrl?: string }): Promise<string[]>;
  onTranslationProgress(callback: (event: TranslationProgressEvent) => void): () => void;
  getLaunchContext(): Promise<{ projectPath?: string }>;
  window: {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
  };
}

type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
  localized?: boolean;
  keyPath?: string;
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

type TranslationPatchPayload = {
  projectPath: string;
  relativePath: string;
  text: string;
  line: number;
  column: number;
  key: string;
  functionName: string;
  importSource?: string;
  importKind?: 'named' | 'default';
  skipImport?: boolean;
};

type DependencyPayload = {
  projectPath: string;
  packageName: string;
};

declare global {
  interface Window {
    api: LocrootAPI;
  }
}
