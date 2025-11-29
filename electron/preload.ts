import { contextBridge, ipcRenderer } from 'electron';
import type { LocaleForgeAPI, TranslationProgressEvent } from './preload.d';

const api: LocaleForgeAPI = {
  async openProject() {
    return ipcRenderer.invoke('project:select');
  },
  async openLanguageDirectory(defaultPath?: string) {
    return ipcRenderer.invoke('lang:select-dir', defaultPath ? { defaultPath } : undefined);
  },
  async listProjectFolders(payload) {
    return ipcRenderer.invoke('project:list-folders', payload);
  },
  async autoDetectLanguageDirectory(payload) {
    return ipcRenderer.invoke('lang:auto-detect', payload);
  },
  async listLanguageFiles(payload) {
    return ipcRenderer.invoke('lang:list', payload);
  },
  async createLanguageFile(payload) {
    return ipcRenderer.invoke('lang:create', payload);
  },
  async openLanguageFile() {
    return ipcRenderer.invoke('lang:select');
  },
  async scanProject(params) {
    return ipcRenderer.invoke('project:scan', params);
  },
  async applyTranslationPatch(payload) {
    return ipcRenderer.invoke('codemod:wrap-translation', payload);
  },
  async checkDependency(payload) {
    return ipcRenderer.invoke('codemod:check-dependency', payload);
  },
  async installDependency(payload) {
    return ipcRenderer.invoke('codemod:install-dependency', payload);
  },
  async loadLanguageFile(path) {
    return ipcRenderer.invoke('lang:load', { path });
  },
  async saveLanguageFile(payload) {
    return ipcRenderer.invoke('lang:save', payload);
  },
  showItemInFolder(targetPath) {
    ipcRenderer.invoke('os:reveal', targetPath);
  },
  async getTranslationSettings() {
    return ipcRenderer.invoke('translation:settings:get');
  },
  async saveTranslationSettings(value) {
    return ipcRenderer.invoke('translation:settings:save', value);
  },
  async runTranslationSync(payload) {
    return ipcRenderer.invoke('translation:sync', payload);
  },
  async listTranslationModels(payload) {
    return ipcRenderer.invoke('translation:models:list', payload);
  },
  onTranslationProgress(callback) {
    const listener = (_event: Electron.IpcRendererEvent, data: TranslationProgressEvent) => callback(data);
    ipcRenderer.on('translation:progress', listener);
    return () => {
      ipcRenderer.removeListener('translation:progress', listener);
    };
  },
  async getLaunchContext() {
    return ipcRenderer.invoke('launch:get-context');
  },
  window: {
    minimize() {
      return ipcRenderer.invoke('window:minimize');
    },
    maximize() {
      return ipcRenderer.invoke('window:maximize');
    },
    close() {
      return ipcRenderer.invoke('window:close');
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
