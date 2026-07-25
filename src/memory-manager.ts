import { app } from 'electron';

/**
 * 内存管理器：定期清理未使用的内存
 */
export class MemoryManager {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分钟

  /**
   * 启动内存清理
   */
  static start(): void {
    if (this.cleanupInterval) return;

    // 定期触发垃圾回收
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 停止内存清理
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 执行清理
   */
  private static performCleanup(): void {
    try {
      // 触发 V8 垃圾回收（需要启动时添加 --expose-gc 参数）
      if (global.gc) {
        global.gc();
      }

      // 清理应用缓存
      app.clearRecentDocuments();
    } catch (err) {
      // 忽略错误
    }
  }

  /**
   * 手动触发清理
   */
  static manualCleanup(): void {
    this.performCleanup();
  }
}
