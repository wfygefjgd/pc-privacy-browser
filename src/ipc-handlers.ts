import { BrowserWindow, Session, ipcMain } from 'electron';
import { PrivacyEngine } from './privacy-engine';

export function setupIPCHandlers(window: BrowserWindow, session: Session) {
  // 导航到 URL
  ipcMain.handle('navigate', async (event, url: string) => {
    try {
      const view = window.webContents;
      await view.loadURL(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // 后退
  ipcMain.handle('go-back', async () => {
    if (window.webContents.canGoBack()) {
      window.webContents.goBack();
    }
  });

  // 前进
  ipcMain.handle('go-forward', async () => {
    if (window.webContents.canGoForward()) {
      window.webContents.goForward();
    }
  });

  // 刷新
  ipcMain.handle('reload', async () => {
    window.webContents.reload();
  });

  // 停止加载
  ipcMain.handle('stop', async () => {
    window.webContents.stop();
  });

  // 手动清除并重启
  ipcMain.handle('nuclear-wipe', async () => {
    await PrivacyEngine.nuclearWipe();
    return { success: true };
  });

  // 获取当前 URL
  ipcMain.handle('get-url', async () => {
    return window.webContents.getURL();
  });

  // 获取标题
  ipcMain.handle('get-title', async () => {
    return window.webContents.getTitle();
  });

  // 获取导航状态
  ipcMain.handle('get-nav-state', async () => {
    return {
      canGoBack: window.webContents.canGoBack(),
      canGoForward: window.webContents.canGoForward(),
      isLoading: window.webContents.isLoading(),
    };
  });

  // 注入反指纹脚本
  window.webContents.on('did-start-navigation', () => {
    window.webContents.executeJavaScript(getAntiFingerprint());
  });
}

function getAntiFingerprint(): string {
  return `
(function(){
  if (window.__pcPrivacyBrowser) return;
  window.__pcPrivacyBrowser = true;

  // 伪装屏幕分辨率
  try {
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
    Object.defineProperty(window, 'innerWidth', { get: () => 1920 });
    Object.defineProperty(window, 'innerHeight', { get: () => 1040 });
    Object.defineProperty(window, 'outerWidth', { get: () => 1920 });
    Object.defineProperty(window, 'outerHeight', { get: () => 1040 });
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 1 });
  } catch(e){}

  // 伪装平台
  try {
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  } catch(e){}

  // 移除触摸点
  try {
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  } catch(e){}

  // 伪装硬件
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
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
