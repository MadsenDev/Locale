import kebabCase from 'lodash/kebabCase';
import type { KeyValuePair } from '../types';

const MAX_WORDS = 6;
const MAX_SLUG_LENGTH = 64;
const FALLBACK_PREFIX = 'text';

export function namespaceFromFile(file: string, fallback = 'ui') {
  if (!file) return fallback;

  const parts = file.split(/[\\/]/).filter(Boolean);
  const last = parts.pop() ?? '';
  const withoutExt = last.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const slug = kebabCase(cleaned).replace(/-/g, '_');

  return slug || fallback;
}

export function suggestKey(text: string, namespace = 'strings') {
  const cleaned = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const words = cleaned.split(' ').filter(Boolean);
  const limitedWords = words.slice(0, MAX_WORDS).join(' ');

  let slug = kebabCase(limitedWords).replace(/-/g, '_');
  if (!slug) return `${namespace}.${FALLBACK_PREFIX}_${Date.now()}`;

  if (words.length > MAX_WORDS) {
    slug = `${slug}_${shortHash(text)}`;
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH);
  }

  return `${namespace}.${slug}`;
}

function shortHash(input: string, length = 4) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  const normalized = Math.abs(hash).toString(36);
  if (normalized.length >= length) {
    return normalized.slice(0, length);
  }

  return normalized.padEnd(length, '0');
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
