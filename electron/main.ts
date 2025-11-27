import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { registerProjectHandlers } from './ipc/projectHandlers';
import { registerLanguageHandlers } from './ipc/languageHandlers';
import { registerTranslationHandlers } from './ipc/translationHandlers';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

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

  mainWindow = win;

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
  registerProjectHandlers();
  registerLanguageHandlers();
  registerTranslationHandlers(() => mainWindow, () => app.getPath('userData'));

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

app.on('browser-window-created', (_, window) => {
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });
});

ipcMain.handle('os:reveal', (_event, targetPath: string) => {
  shell.showItemInFolder(targetPath);
});
