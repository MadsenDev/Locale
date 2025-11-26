import kebabCase from 'lodash/kebabCase';
import type { KeyValuePair } from '../types';

export function suggestKey(text: string, namespace = 'strings') {
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const slug = kebabCase(cleaned).replace(/-/g, '_');
  if (!slug) return `${namespace}.text_${Date.now()}`;
  return `${namespace}.${slug}`;
}

export function nestKey(key: string, value: string, target: Record<string, any>) {
  const parts = key.split('.');
  let current: Record<string, any> = target;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      current[part] = value;
    } else {
      current[part] = current[part] ?? {};
      current = current[part];
    }
  });
}

export function flattenLanguageKeys(source: Record<string, any>): Set<string> {
  const entries: KeyValuePair[] = [{ key: '', value: source }];
  const result = new Set<string>();

  while (entries.length) {
    const { key, value } = entries.pop()!;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => {
        const nextKey = key ? `${key}.${childKey}` : childKey;
        entries.push({ key: nextKey, value: childValue });
      });
    } else if (key) {
      result.add(key);
    }
  }

  return result;
}
