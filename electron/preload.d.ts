export interface LocaleForgeAPI {
  openProject(): Promise<string | null>;
  openLanguageFile(): Promise<string | null>;
  scanProject(params: { rootPath: string; extensions: string[]; ignore: string[] }): Promise<{ candidates: CandidateString[] }>;
  loadLanguageFile(path: string): Promise<{ data: any }>;
  saveLanguageFile(payload: { path: string; data: any }): Promise<{ success: boolean }>;
  showItemInFolder(path: string): void;
}

type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
};

declare global {
  interface Window {
    api: LocaleForgeAPI;
  }
}
