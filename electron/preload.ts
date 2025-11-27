import { contextBridge, ipcRenderer } from 'electron';
import type { LocaleForgeAPI } from './preload.d';

const api: LocaleForgeAPI = {
  async openProject() {
    return ipcRenderer.invoke('project:select');
  },
  async openLanguageDirectory() {
    return ipcRenderer.invoke('lang:select-dir');
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
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('translation:progress', listener);
    return () => {
      ipcRenderer.removeListener('translation:progress', listener);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);
