import { BrowserWindow, Session, ipcMain } from 'electron';
import { PrivacyEngine } from './privacy-engine';
import { IdentityGenerator } from './identity-generator';

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
}

export class TabManager {
  private tabs: Map<string, Tab> = new Map();
  private activeTabId: string | null = null;

  createTab(url: string = 'about:blank'): Tab {
    const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tab: Tab = {
      id,
      title: '新标签',
      url,
      isLoading: false,
    };
    this.tabs.set(id, tab);
    this.activeTabId = id;
    return tab;
  }

  getTab(id: string): Tab | undefined {
    return this.tabs.get(id);
  }

  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values());
  }

  getActiveTab(): Tab | null {
    if (!this.activeTabId) return null;
    return this.tabs.get(this.activeTabId) || null;
  }

  setActiveTab(id: string): boolean {
    if (this.tabs.has(id)) {
      this.activeTabId = id;
      return true;
    }
    return false;
  }

  updateTab(id: string, updates: Partial<Tab>): void {
    const tab = this.tabs.get(id);
    if (tab) {
      Object.assign(tab, updates);
    }
  }

  closeTab(id: string): boolean {
    if (this.tabs.size <= 1) return false;

    const deleted = this.tabs.delete(id);
    if (deleted && this.activeTabId === id) {
      const remainingTabs = Array.from(this.tabs.keys());
      this.activeTabId = remainingTabs[0] || null;
    }
    return deleted;
  }

  getTabCount(): number {
    return this.tabs.size;
  }
}

export function setupIPCHandlers(window: BrowserWindow, session: Session, tabManager: TabManager) {
  // 创建新标签
  ipcMain.handle('tab:create', async (event, url?: string) => {
    const tab = tabManager.createTab(url);
    return {
      tabs: tabManager.getAllTabs(),
      activeTabId: tab.id,
    };
  });

  // 关闭标签
  ipcMain.handle('tab:close', async (event, tabId: string) => {
    const success = tabManager.closeTab(tabId);
    return {
      success,
      tabs: tabManager.getAllTabs(),
      activeTabId: tabManager.getActiveTab()?.id || null,
    };
  });

  // 切换标签
  ipcMain.handle('tab:switch', async (event, tabId: string) => {
    const success = tabManager.setActiveTab(tabId);
    return {
      success,
      activeTabId: tabId,
    };
  });

  // 获取所有标签
  ipcMain.handle('tab:getAll', async () => {
    return {
      tabs: tabManager.getAllTabs(),
      activeTabId: tabManager.getActiveTab()?.id || null,
    };
  });

  // 更新标签信息
  ipcMain.handle('tab:update', async (event, tabId: string, updates: Partial<Tab>) => {
    tabManager.updateTab(tabId, updates);
    return { success: true };
  });

  // 导航到 URL
  ipcMain.handle('navigate', async (event, url: string, tabId?: string) => {
    const targetTab = tabId ? tabManager.getTab(tabId) : tabManager.getActiveTab();
    if (!targetTab) return { success: false, error: 'No active tab' };

    try {
      tabManager.updateTab(targetTab.id, { url, isLoading: true });
      return { success: true, tabId: targetTab.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 后退
  ipcMain.handle('go-back', async () => {
    window.webContents.executeJavaScript(`
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview && activeWebview.canGoBack()) {
        activeWebview.goBack();
      }
    `);
  });

  // 前进
  ipcMain.handle('go-forward', async () => {
    window.webContents.executeJavaScript(`
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview && activeWebview.canGoForward()) {
        activeWebview.goForward();
      }
    `);
  });

  // 刷新
  ipcMain.handle('reload', async () => {
    window.webContents.executeJavaScript(`
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview) {
        activeWebview.reload();
      }
    `);
  });

  // 停止加载
  ipcMain.handle('stop', async () => {
    window.webContents.executeJavaScript(`
      const activeWebview = document.querySelector('webview.active');
      if (activeWebview) {
        activeWebview.stop();
      }
    `);
  });

  // 手动清除并重启
  ipcMain.handle('nuclear-wipe', async () => {
    await PrivacyEngine.nuclearWipe();
    return { success: true };
  });

  // 获取导航状态
  ipcMain.handle('get-nav-state', async () => {
    return window.webContents.executeJavaScript(`
      (function() {
        const activeWebview = document.querySelector('webview.active');
        if (!activeWebview) return { canGoBack: false, canGoForward: false, isLoading: false };
        return {
          canGoBack: activeWebview.canGoBack(),
          canGoForward: activeWebview.canGoForward(),
          isLoading: false
        };
      })()
    `);
  });
}

function getAntiFingerprint(identity?: any): string {
  const id = identity || {
    platform: { name: 'Win32' },
    screen: { width: 1920, height: 1080 },
    hardware: { cores: 8, memory: 8 },
    locale: { lang: 'en-US', langs: ['en-US', 'en'] },
    timezone: { name: 'UTC', offset: 0 },
  };

  return `
(function(){
  if (window.__pcPrivacyBrowser) return;
  window.__pcPrivacyBrowser = true;

  const _identity = ${JSON.stringify(id)};

  // 伪装屏幕分辨率（随机身份）
  try {
    Object.defineProperty(screen, 'width', { get: () => _identity.screen.width });
    Object.defineProperty(screen, 'height', { get: () => _identity.screen.height });
    Object.defineProperty(screen, 'availWidth', { get: () => _identity.screen.width });
    Object.defineProperty(screen, 'availHeight', { get: () => _identity.screen.height - 40 });
    Object.defineProperty(window, 'innerWidth', { get: () => _identity.screen.width });
    Object.defineProperty(window, 'innerHeight', { get: () => _identity.screen.height - 100 });
    Object.defineProperty(window, 'outerWidth', { get: () => _identity.screen.width });
    Object.defineProperty(window, 'outerHeight', { get: () => _identity.screen.height });
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 });
  } catch(e){}

  // 伪装平台（随机身份）
  try {
    Object.defineProperty(navigator, 'platform', { get: () => _identity.platform.name });
  } catch(e){}

  // 移除触摸点
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  } catch(e){}

  // 伪装硬件（随机身份）
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => _identity.hardware.cores });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => _identity.hardware.memory });
  } catch(e){}

  // 语言指纹防护（随机身份）
  try {
    Object.defineProperty(navigator, 'language', { get: () => _identity.locale.lang });
    Object.defineProperty(navigator, 'languages', { get: () => _identity.locale.langs });
  } catch(e){}

  // 时区伪装（随机身份）
  try {
    const offset = _identity.timezone.offset;
    Date.prototype.getTimezoneOffset = function() { return -offset; };

    const origToLocaleString = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = function(...args) {
      return origToLocaleString.call(this, _identity.locale.lang, ...args);
    };

    try {
      Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
        value: function() {
          return {
            timeZone: _identity.timezone.name,
            locale: _identity.locale.lang
          };
        }
      });
    } catch(e){}
  } catch(e){}

  // 阻止 Canvas 指纹
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function() {
      const blank = document.createElement('canvas');
      blank.width = this.width;
      blank.height = this.height;
      return origToDataURL.call(blank);
    };

    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) {
      const blank = document.createElement('canvas');
      blank.width = this.width;
      blank.height = this.height;
      return origToBlob.call(blank, callback);
    };
  } catch(e){}

  // 阻止 WebGL 指纹
  try {
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel(R) UHD Graphics 630';
      return origGetParameter.call(this, param);
    };
  } catch(e){}

  // 阻止 WebRTC IP 泄露
  try {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function() {
      return Promise.reject(new Error('Permission denied'));
    };
  } catch(e){}

  // 阻止电池 API
  try {
    Object.defineProperty(navigator, 'getBattery', {
      get: () => undefined
    });
  } catch(e){}

  // 阻止 Gamepad API
  try {
    Object.defineProperty(navigator, 'getGamepads', {
      get: () => () => []
    });
  } catch(e){}

  // 时区伪装（可选，设置为 UTC）
  try {
    Date.prototype.getTimezoneOffset = () => 0;
  } catch(e){}
})();
  `;
}
