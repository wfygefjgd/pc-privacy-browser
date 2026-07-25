import { Session, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class PrivacyEngine {
  private static isWiping = false;
  private static waiters: Array<() => void> = [];

  /**
   * 核心清除：彻底擦除所有痕迹
   */
  static async nuclearWipe(): Promise<void> {
    if (this.isWiping) {
      return new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }

    this.isWiping = true;

    try {
      // 并行执行清除操作以提升性能
      await Promise.all([
        this.wipeSessions(),
        this.wipeUserDataDir(),
        this.clearClipboard(),
        this.clearDNSCache(),
      ]);
    } finally {
      this.isWiping = false;
      this.waiters.forEach((resolve) => resolve());
      this.waiters = [];
    }
  }

  /**
   * 启动时清除
   */
  static async wipeOnLaunch(): Promise<void> {
    await this.nuclearWipe();
  }

  /**
   * 后台清除（不退出进程）
   */
  static async wipeOnBackground(): Promise<void> {
    await this.nuclearWipe();
  }

  /**
   * 配置隐私 Session
   */
  static async configureSession(ses: Session): Promise<void> {
    // 禁用缓存
    await ses.clearCache();
    await ses.clearStorageData();

    // 清除所有 Cookie
    await ses.cookies.flushStore();
    await ses.clearAuthCache();
    await ses.clearHostResolverCache();

    // 禁用持久化
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
      // 拒绝所有持久化权限
      if (permission === 'persistent-storage') {
        callback(false);
        return;
      }
      // 其他权限也默认拒绝（需要时可以调整）
      callback(false);
    });

    // 注入反指纹脚本
    ses.webRequest.onBeforeRequest((details, callback) => {
      callback({});
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders || {};

      // 移除可能泄露信息的 headers
      delete headers['X-Powered-By'];
      delete headers['Server'];

      callback({ responseHeaders: headers });
    });

    // 随机化 User-Agent
    const userAgent = this.generateRandomUserAgent();
    ses.setUserAgent(userAgent);

    // 禁用 WebRTC（防止 IP 泄露）
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        callback(false);
        return;
      }
      callback(false);
    });
  }

  /**
   * 清除所有 sessions
   */
  private static async wipeSessions(): Promise<void> {
    const sessions = [
      'privacy',
      // 可以添加其他 partition 名称
    ];

    // 并行清除所有 session
    await Promise.all(
      sessions.map(async (partition) => {
        try {
          const ses = require('electron').session.fromPartition(partition);
          // 并行执行所有清除操作
          await Promise.all([
            ses.clearCache(),
            ses.clearStorageData({
              storages: [
                'appcache',
                'cookies',
                'filesystem',
                'indexdb',
                'localstorage',
                'shadercache',
                'websql',
                'serviceworkers',
                'cachestorage',
              ],
            }),
            ses.clearAuthCache(),
            ses.clearHostResolverCache(),
            ses.cookies.flushStore(),
          ]);
        } catch (err) {
          // 忽略错误继续
        }
      })
    );
  }

  /**
   * 清除用户数据目录
   */
  private static async wipeUserDataDir(): Promise<void> {
    const userDataPath = app.getPath('userData');
    const dirsToWipe = [
      path.join(userDataPath, 'Cache'),
      path.join(userDataPath, 'Code Cache'),
      path.join(userDataPath, 'GPUCache'),
      path.join(userDataPath, 'Service Worker'),
      path.join(userDataPath, 'Session Storage'),
      path.join(userDataPath, 'Local Storage'),
      path.join(userDataPath, 'IndexedDB'),
      path.join(userDataPath, 'Cookies'),
      path.join(userDataPath, 'Cookies-journal'),
    ];

    // 并行删除所有目录
    await Promise.all(
      dirsToWipe.map(async (dir) => {
        try {
          if (fs.existsSync(dir)) {
            await fs.promises.rm(dir, { recursive: true, force: true });
          }
        } catch (err) {
          // 忽略错误继续
        }
      })
    );
  }

  /**
   * 清除剪贴板
   */
  private static async clearClipboard(): Promise<void> {
    try {
      const { clipboard } = require('electron');
      clipboard.clear();
    } catch (err) {
      // 忽略
    }
  }

  /**
   * 清除 DNS 缓存
   */
  private static async clearDNSCache(): Promise<void> {
    // Electron 没有直接 API，通过清除 session 的 host resolver cache 实现
    try {
      const { session } = require('electron');
      const ses = session.defaultSession;
      await ses.clearHostResolverCache();
    } catch (err) {
      // 忽略
    }
  }

  /**
   * 生成随机 User-Agent
   */
  private static generateRandomUserAgent(): string {
    const chromeVersions = ['122.0.6261.94', '121.0.6167.85', '120.0.6099.109'];
    const windowsVersions = ['10.0', '11.0'];

    const chrome = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
    const windows = windowsVersions[Math.floor(Math.random() * windowsVersions.length)];

    return `Mozilla/5.0 (Windows NT ${windows}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`;
  }
}
