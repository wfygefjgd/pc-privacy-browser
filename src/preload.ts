import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('privacyBrowser', {
  navigate: (url: string) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  stop: () => ipcRenderer.invoke('stop'),
  nuclearWipe: () => ipcRenderer.invoke('nuclear-wipe'),
  getUrl: () => ipcRenderer.invoke('get-url'),
  getTitle: () => ipcRenderer.invoke('get-title'),
  getNavState: () => ipcRenderer.invoke('get-nav-state'),
});
