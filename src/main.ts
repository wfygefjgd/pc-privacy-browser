import { app, BrowserWindow, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { PrivacyEngine } from './privacy-engine';
import { setupIPCHandlers, TabManager } from './ipc-handlers';

// 禁用硬件加速以避免 GPU 指纹
app.disableHardwareAcceleration();

// 禁用 DNS 预取
app.commandLine.appendSwitch('disable-dns-prefetch');
app.commandLine.appendSwitch('disable-preconnect');

// 禁用各种遥测和跟踪
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');

let mainWindow: BrowserWindow | null = null;
const tabManager = new TabManager();

async function createWindow() {
  // 创建隐私会话（完全隔离）
  const privacySession = session.fromPartition('privacy', { cache: false });

  // 配置极致隐私设置
  await PrivacyEngine.configureSession(privacySession);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      partition: 'privacy',
      session: privacySession,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // 加载主界面
  await mainWindow.loadFile(path.join(__dirname, '../index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 初始化第一个标签
  tabManager.createTab('about:blank');

  // 设置 IPC 处理器
  setupIPCHandlers(mainWindow, privacySession, tabManager);

  // 阻止新窗口打开（除非明确允许）
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 在同一个隐私会话中打开
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          partition: 'privacy',
          session: privacySession,
        },
      },
    };
  });
}

app.whenReady().then(async () => {
  // 启动时彻底清除所有数据
  await PrivacyEngine.wipeOnLaunch();

  await createWindow();
});

app.on('window-all-closed', async () => {
  // 关闭前彻底清除
  await PrivacyEngine.nuclearWipe();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 进入后台时清除数据（但不退出）
app.on('browser-window-blur', async () => {
  await PrivacyEngine.wipeOnBackground();
});
