import { dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { scanProject } from '../scanner';
import { DEFAULT_FOLDER_IGNORES, directoryHasChildDirectories } from '../utils/fsHelpers';

type DirectoryNode = {
  name: string;
  path: string;
  hasChildren: boolean;
};

async function isDirectoryEntry(targetPath: string, entry: fs.Dirent) {
  if (entry.isDirectory()) return true;
  if (entry.isSymbolicLink()) {
    try {
      const stats = await fs.stat(targetPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

export function registerProjectHandlers() {
  ipcMain.handle('project:select', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('project:list-folders', async (_event, payload: { root: string; path?: string }) => {
    const root = payload.root;
    const target = payload.path ? path.join(root, payload.path) : root;

    try {
      const entries = await fs.readdir(target, { withFileTypes: true });
      const children: DirectoryNode[] = [];
      for (const entry of entries) {
        if (DEFAULT_FOLDER_IGNORES.has(entry.name)) continue;
        const childPath = path.join(target, entry.name);
        if (!(await isDirectoryEntry(childPath, entry))) {
          continue;
        }
        const relative = path.relative(root, childPath);
        const hasChildren = await directoryHasChildDirectories(childPath);
        children.push({
          name: entry.name,
          path: relative,
          hasChildren,
        });
      }

      return { children };
    } catch (error) {
      console.error('Failed to list folders', error);
      return { children: [] };
    }
  });

  ipcMain.handle('project:scan', async (_event, params) => {
    const { rootPath, extensions, ignore, directories } = params;
    const candidates = await scanProject(rootPath, extensions, ignore, directories);
    return { candidates };
  });
}

