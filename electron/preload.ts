import { contextBridge, ipcRenderer } from 'electron';
import type { LocaleForgeAPI } from './preload.d';

const api: LocaleForgeAPI = {
  async openProject() {
    return ipcRenderer.invoke('project:select');
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
};

contextBridge.exposeInMainWorld('api', api);
