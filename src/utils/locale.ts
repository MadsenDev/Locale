const LOCALE_ALIASES: Record<string, string> = {
  se: 'sv',
  'zh-hans': 'zh-cn',
  'zh-hant': 'zh-tw',
};

export function normalizeLocaleInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const normalized = trimmed.replace(/_/g, '-').toLowerCase();
  return LOCALE_ALIASES[normalized] ?? normalized;
}

export function hasLocaleAlias(value: string) {
  return Boolean(LOCALE_ALIASES[value.toLowerCase()]);
}

