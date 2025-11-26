import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { scanProject } from './scanner';

const isDev = !app.isPackaged;

async function createWindow() {
  const preloadPath = isDev
    ? path.join(__dirname, 'preload.ts')
    : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
    await win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    await win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('project:select', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('lang:select', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'createDirectory'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('project:scan', async (_event, params) => {
  const { rootPath, extensions, ignore } = params;
  const candidates = await scanProject(rootPath, extensions, ignore);
  return { candidates };
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

ipcMain.handle('os:reveal', (_event, targetPath: string) => {
  shell.showItemInFolder(targetPath);
});
