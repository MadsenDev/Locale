import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { registerProjectHandlers } from './ipc/projectHandlers';
import { registerLanguageHandlers } from './ipc/languageHandlers';
import { registerTranslationHandlers } from './ipc/translationHandlers';
import { registerCodeModHandlers } from './ipc/codeModHandlers';

type LaunchContext = {
  projectPath?: string;
};

const launchContext: LaunchContext = {};
const initialProjectArg = app.commandLine.getSwitchValue('project');
if (initialProjectArg) {
  launchContext.projectPath = path.resolve(initialProjectArg);
}

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

const isMac = process.platform === 'darwin';

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#020617',
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    titleBarOverlay: !isMac
      ? {
          color: '#020617',
          symbolColor: '#f8fafc',
          height: 40,
        }
      : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);

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
  registerCodeModHandlers();

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

ipcMain.handle('launch:get-context', () => launchContext);

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.restore();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});
