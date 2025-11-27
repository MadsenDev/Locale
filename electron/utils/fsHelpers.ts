import fs from 'fs/promises';

export const DEFAULT_FOLDER_IGNORES = new Set(['node_modules', '.git', '.cache', 'dist', 'build', '.next', 'coverage']);

export async function directoryHasLanguageFiles(target: string) {
  try {
    const stats = await fs.stat(target);
    if (!stats.isDirectory()) return false;
    const entries = await fs.readdir(target);
    return entries.some((entry) => {
      const lower = entry.toLowerCase();
      if (!lower.endsWith('.json')) return false;
      const base = lower.replace(/\.json$/, '');
      return /^[a-z]{2}(-[a-z0-9]+)?$/.test(base);
    });
  } catch {
    return false;
  }
}

export async function directoryHasChildDirectories(target: string) {
  try {
    const entries = await fs.readdir(target, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory());
  } catch {
    return false;
  }
}

