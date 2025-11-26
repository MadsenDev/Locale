import kebabCase from 'lodash/kebabCase';

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
