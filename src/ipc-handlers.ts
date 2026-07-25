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

  // 阻止 Canvas 指纹（但保留基本功能以支持验证码）
  try {
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const origGetContext = HTMLCanvasElement.prototype.getContext;

    // 只对大尺寸 canvas 进行指纹防护（小尺寸可能是验证码）
    HTMLCanvasElement.prototype.toDataURL = function() {
      // 验证码 canvas 通常较小（< 500x500），不拦截
      if (this.width < 500 && this.height < 500) {
        return origToDataURL.call(this);
      }
      // 大尺寸 canvas 返回空白（防指纹）
      const blank = document.createElement('canvas');
      blank.width = this.width;
      blank.height = this.height;
      return origToDataURL.call(blank);
    };

    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback) {
      // 验证码 canvas 不拦截
      if (this.width < 500 && this.height < 500) {
        return origToBlob.call(this, callback);
      }
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

  // 字体指纹防护
  try {
    Object.defineProperty(document, 'fonts', {
      get: () => ({
        check: () => false,
        ready: Promise.resolve(new Set()),
        size: 0,
        add: () => {},
        clear: () => {},
        delete: () => false,
        entries: () => [][Symbol.iterator](),
        forEach: () => {},
        has: () => false,
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator]()
      })
    });
  } catch(e){}

  // 音频指纹防护
  try {
    const origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(channel) {
      const data = origGetChannelData.call(this, channel);
      for (let i = 0; i < data.length; i += 100) {
        data[i] += Math.random() * 0.0001 - 0.00005;
      }
      return data;
    };

    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      const origCreateOscillator = OrigAudioContext.prototype.createOscillator;
      OrigAudioContext.prototype.createOscillator = function() {
        const osc = origCreateOscillator.call(this);
        const origStart = osc.start;
        osc.start = function(when) {
          osc.frequency.value += Math.random() * 0.001 - 0.0005;
          return origStart.call(this, when);
        };
        return osc;
      };
    }
  } catch(e){}

  // 媒体设备枚举防护
  try {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices = async () => [];
      navigator.mediaDevices.getSupportedConstraints = () => ({});
    }
  } catch(e){}

  // 网络信息 API 防护
  try {
    delete navigator.connection;
    delete navigator.mozConnection;
    delete navigator.webkitConnection;
  } catch(e){}

  // 插件检测防护
  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => []
    });
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => []
    });
  } catch(e){}

  // Clipboard 读取限制
  try {
    if (navigator.clipboard) {
      navigator.clipboard.read = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      navigator.clipboard.readText = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    }
  } catch(e){}

  // Geolocation 阻断
  try {
    navigator.geolocation.getCurrentPosition = (success, error) => {
      if (error) error({ code: 1, message: 'User denied Geolocation' });
    };
    navigator.geolocation.watchPosition = (success, error) => {
      if (error) error({ code: 1, message: 'User denied Geolocation' });
      return 0;
    };
  } catch(e){}

  // 键盘布局指纹防护
  try {
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
      navigator.keyboard.getLayoutMap = () => Promise.resolve(new Map());
    }
  } catch(e){}

  // 性能 API 限制
  try {
    const origNow = performance.now;
    performance.now = function() {
      return Math.floor(origNow.call(this) / 100) * 100;
    };
    performance.memory = undefined;
  } catch(e){}

  // CSS 特性检测防护
  try {
    const origSupports = CSS.supports;
    CSS.supports = function(property, value) {
      const standard = [
        'display', 'color', 'background', 'font-size', 'width', 'height',
        'margin', 'padding', 'border', 'position', 'flex', 'grid'
      ];
      if (arguments.length === 1) {
        return standard.some(p => arguments[0].includes(p));
      }
      return standard.includes(property);
    };
  } catch(e){}

  // 传感器 API 阻断
  try {
    delete window.DeviceMotionEvent;
    delete window.DeviceOrientationEvent;
    delete window.Accelerometer;
    delete window.Gyroscope;
    delete window.LinearAccelerationSensor;
    delete window.Magnetometer;
    delete window.AbsoluteOrientationSensor;
    delete window.RelativeOrientationSensor;
  } catch(e){}

  // Notification API 限制
  try {
    if (window.Notification) {
      Notification.requestPermission = () => Promise.resolve('denied');
      Object.defineProperty(Notification, 'permission', {
        get: () => 'denied'
      });
    }
  } catch(e){}

  // MIDI API 阻断
  try {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess = () => Promise.reject(new DOMException('Permission denied', 'SecurityError'));
    }
  } catch(e){}

  // USB API 阻断
  try {
    if (navigator.usb) {
      navigator.usb.getDevices = () => Promise.resolve([]);
      navigator.usb.requestDevice = () => Promise.reject(new DOMException('Permission denied', 'NotFoundError'));
    }
  } catch(e){}

  // Bluetooth API 阻断
  try {
    if (navigator.bluetooth) {
      navigator.bluetooth.getAvailability = () => Promise.resolve(false);
      navigator.bluetooth.requestDevice = () => Promise.reject(new DOMException('Permission denied', 'NotFoundError'));
    }
  } catch(e){}

  // Presentation API 阻断
  try {
    if (navigator.presentation) {
      navigator.presentation.defaultRequest = null;
    }
  } catch(e){}
})();
  `;
}
