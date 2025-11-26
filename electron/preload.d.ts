export interface LocaleForgeAPI {
  openProject(): Promise<string | null>;
  openLanguageDirectory(): Promise<string | null>;
  listLanguageFiles(payload: { directory: string }): Promise<{ files: LanguageFileSummary[] }>;
  createLanguageFile(payload: { directory: string; code: string }): Promise<{ path: string }>;
  openLanguageFile(): Promise<string | null>;
  scanProject(params: { rootPath: string; extensions: string[]; ignore: string[] }): Promise<{ candidates: CandidateString[] }>;
  loadLanguageFile(path: string): Promise<{ data: any }>;
  saveLanguageFile(payload: { path: string; data: any }): Promise<{ success: boolean }>;
  showItemInFolder(path: string): void;
  getTranslationSettings(): Promise<TranslationSettings | null>;
  saveTranslationSettings(value: TranslationSettings | null): Promise<TranslationSettings | null>;
  runTranslationSync(payload: { basePath: string; languageDir: string }): Promise<TranslationSyncResult>;
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

type TranslationSettings = {
  provider: 'deepl';
  apiKey: string;
  apiUrl?: string;
};

type TranslationSyncResult = {
  updatedFiles: number;
  translatedKeys: number;
  skippedFiles: number;
};

declare global {
  interface Window {
    api: LocaleForgeAPI;
  }
}
