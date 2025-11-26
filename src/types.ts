export type CandidateString = {
  id: string;
  text: string;
  file: string;
  line: number;
  column: number;
  context: string;
  keySuggestion?: string;
  include?: boolean;
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
