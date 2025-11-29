import { dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import fg from 'fast-glob';
import { directoryHasLanguageFiles } from '../utils/fsHelpers';

export function registerLanguageHandlers() {
  ipcMain.handle('lang:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'createDirectory'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('lang:select-dir', async (_event, payload?: { defaultPath?: string }) => {
    let defaultPath = payload?.defaultPath;
    if (defaultPath) {
      try {
        await fs.access(defaultPath);
      } catch {
        defaultPath = undefined;
      }
    }

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath,
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('lang:list', async (_event, payload: { directory: string }) => {
    const entries = await fs.readdir(payload.directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => ({
        name: entry.name,
        path: path.join(payload.directory, entry.name),
      }));
    return { files };
  });

  ipcMain.handle('lang:auto-detect', async (_event, payload: { projectPath: string }) => {
    const searchRoots = [
      'locales',
      'locale',
      'i18n',
      'translations',
      'translation',
      'lang',
      'languages',
      path.join('src', 'locales'),
      path.join('public', 'locales'),
    ];

    for (const relative of searchRoots) {
      const candidate = path.join(payload.projectPath, relative);
      if (await directoryHasLanguageFiles(candidate)) {
        return candidate;
      }
    }

    const match = await fg(['**/en.json', '**/en-*.json'], {
      cwd: payload.projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      deep: 4,
      onlyFiles: true,
      absolute: true,
    });

    if (match.length > 0) {
      return path.dirname(match[0]);
    }

    return null;
  });

  ipcMain.handle('lang:create', async (_event, payload: { directory: string; code: string }) => {
    const safeCode = payload.code.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'base';
    const fileName = safeCode.endsWith('.json') ? safeCode : `${safeCode}.json`;
    const targetPath = path.join(payload.directory, fileName);

    try {
      await fs.access(targetPath);
    } catch {
      await fs.writeFile(targetPath, JSON.stringify({}, null, 2), 'utf8');
    }

    return { path: targetPath };
  });

  ipcMain.handle('lang:load', async (_event, payload) => {
    const raw = await fs.readFile(payload.path, 'utf8');
    const data = JSON.parse(raw);
    return { data };
  });

  ipcMain.handle('lang:save', async (_event, payload) => {
    await fs.writeFile(payload.path, JSON.stringify(payload.data, null, 2), 'utf8');
    return { success: true };
  });
}

