# PC 隐私浏览器 - 使用指南

## 快速开始

### 1. 安装依赖

```bash
cd PC隐私浏览器
npm install
```

### 2. 运行开发模式

```bash
npm run dev
```

### 3. 构建生产版本

```bash
# 编译 TypeScript
npm run build

# 启动应用
npm start
```

### 4. 打包成可执行文件

```bash
# Windows
npm run build && electron-builder --win

# macOS
npm run build && electron-builder --mac

# Linux
npm run build && electron-builder --linux
```

## 使用说明

### 浏览网页

1. **直接输入网址**：在地址栏输入完整 URL（如 `https://example.com`）
2. **搜索关键词**：输入关键词自动使用 DuckDuckGo 搜索
3. **简化域名**：输入 `example.com` 自动补全为 `https://example.com`

### 导航操作

- **← 后退**：返回上一页
- **→ 前进**：前进到下一页  
- **↻ 刷新**：重新加载当前页面
- **✕ 停止**：加载时显示，点击停止加载

### 手动清除

点击右上角的 **🗑️ 清除** 按钮，会：
- 清除所有 Cookie
- 清除所有缓存
- 清除浏览历史
- 清除 Local Storage
- 清除剪贴板
- 返回空白页

### 自动清除机制

浏览器会在以下情况自动清除所有数据：

1. **启动时**：每次打开浏览器都会清除上次的所有残留
2. **关闭时**：退出浏览器时彻底擦除所有痕迹
3. **失去焦点时**（可选）：切换到其他应用时自动清理

## 隐私特性详解

### 反指纹技术

**Canvas 指纹防护**
- 阻止网站通过 Canvas 画布采集浏览器指纹
- 返回空白画布，使每次采集结果不同

**WebGL 指纹防护**
- 伪装显卡型号为常见的 Intel UHD Graphics 630
- 阻止通过 WebGL 参数识别设备

**屏幕指纹防护**
- 伪装分辨率为标准的 1920×1080
- 隐藏真实的显示器配置

**硬件指纹防护**
- CPU 核心数伪装为 8 核
- 内存大小伪装为 8GB
- 隐藏真实硬件配置

**浏览器指纹防护**
- 每次启动随机生成不同的 User-Agent
- 阻止通过 User-Agent 追踪

### 网络隐私

**禁用 WebRTC**
- 防止泄露真实 IP 地址
- 阻止 WebRTC IP 泄露攻击

**禁用 DNS 预取**
- 防止提前解析域名暴露浏览意图
- 减少信息泄露

**禁用后台网络**
- 阻止所有遥测数据上报
- 无隐藏的后台请求

### 数据隔离

**独立会话**
- 使用完全隔离的 `privacy` partition
- 与系统浏览器完全分离

**内存存储**
- 所有数据仅保存在内存中
- 不写入磁盘，关闭即消失

**禁用持久化**
- IndexedDB、LocalStorage 等全部禁用
- 无法保存任何本地数据

## 常见问题

### 为什么无法登录网站？

因为关闭后所有 Cookie 都会被清除，无法保持登录状态。这是极致隐私的代价。

### 为什么某些网站显示异常？

反指纹措施可能导致某些网站功能异常。如果需要正常使用，请使用常规浏览器。

### 是否支持插件/扩展？

不支持。插件可能绕过隐私保护机制，因此未启用扩展功能。

### 与 Tor 浏览器有什么区别？

- **Tor**：通过洋葱路由隐藏 IP，但速度较慢
- **本浏览器**：不隐藏 IP，专注于阻止追踪和指纹识别，速度快

建议结合使用 VPN 以隐藏真实 IP。

### 安全性如何？

浏览器基于 Chromium 内核（Electron），安全性与 Chrome 相同。隐私保护机制经过精心设计，参考了 iOS 版本的成熟方案。

## 技术细节

### 启动流程

```
1. 清除残留数据
   └── 删除 Cache、GPUCache、Service Worker 等目录
   └── 清除所有 Session 数据
   └── 清空剪贴板

2. 创建隔离会话
   └── partition = 'privacy'
   └── cache = false

3. 配置隐私设置
   └── 禁用持久化存储
   └── 禁用硬件加速
   └── 禁用 DNS 预取
   └── 禁用后台网络

4. 注入反指纹脚本
   └── 在每个页面加载前注入

5. 随机化标识
   └── 生成随机 User-Agent
```

### 清除流程

```
1. 清除 Web 层
   └── clearCache()
   └── clearStorageData()
   └── clearAuthCache()
   └── clearHostResolverCache()

2. 清除文件系统
   └── 删除 userData 下所有缓存目录

3. 清除剪贴板
   └── clipboard.clear()

4. 退出（可选）
   └── app.quit()
```

## 开发说明

### 项目结构

```
PC隐私浏览器/
├── src/
│   ├── main.ts              # Electron 主进程
│   ├── preload.ts           # 预加载脚本
│   ├── privacy-engine.ts    # 隐私引擎
│   └── ipc-handlers.ts      # IPC 通信
├── index.html               # 主界面
├── renderer.js              # 渲染进程逻辑
├── package.json             # 项目配置
└── tsconfig.json            # TypeScript 配置
```

### 添加新功能

1. 修改 `src/main.ts` 添加主进程逻辑
2. 修改 `src/ipc-handlers.ts` 添加 IPC 处理
3. 修改 `renderer.js` 添加 UI 交互
4. 运行 `npm run dev` 测试

### 调试

开发模式下按 `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (macOS) 打开开发者工具。

## 更新计划

- [ ] 添加多标签支持
- [ ] 添加书签功能
- [ ] 添加历史记录（内存中）
- [ ] 添加下载管理
- [ ] 优化 UI 界面
- [ ] 添加快捷键支持

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
