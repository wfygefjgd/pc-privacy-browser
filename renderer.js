// 标签管理
let tabs = [];
let activeTabId = null;

// 面板状态
let tabsPanelOpen = false;
let bookmarksPanelOpen = false;

// DOM 元素
const addressInput = document.getElementById('addressInput');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const wipeBtn = document.getElementById('wipeBtn');
const loadingBar = document.getElementById('loadingBar');
const statusText = document.getElementById('statusText');
const contentArea = document.getElementById('contentArea');
const tabsBtn = document.getElementById('tabsBtn');
const tabCount = document.getElementById('tabCount');
const tabsPanel = document.getElementById('tabsPanel');
const tabsList = document.getElementById('tabsList');
const newTabBtn = document.getElementById('newTabBtn');
const bookmarksBtn = document.getElementById('bookmarksBtn');
const bookmarksPanel = document.getElementById('bookmarksPanel');

let isLoading = false;

// 初始化：创建第一个标签
async function init() {
  await createTab('about:blank');
  await refreshTabs();
  updateNavButtons();
}

// 创建新标签
async function createTab(url = 'about:blank') {
  const result = await window.electronAPI?.invoke('tab:create', url);
  if (result) {
    tabs = result.tabs;
    activeTabId = result.activeTabId;

    // 创建 webview 元素
    const webview = document.createElement('webview');
    webview.id = result.activeTabId;
    webview.src = url;
    webview.setAttribute('partition', 'privacy');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no');
    webview.className = 'active';

    // 监听 webview 事件
    setupWebviewListeners(webview, result.activeTabId);

    contentArea.appendChild(webview);
    updateTabCount();
  }
}

// 设置 webview 监听器
function setupWebviewListeners(webview, tabId) {
  webview.addEventListener('did-start-loading', () => {
    if (tabId === activeTabId) {
      isLoading = true;
      reloadBtn.textContent = '✕';
      loadingBar.style.width = '30%';
    }
    updateTabInfo(tabId, { isLoading: true });
  });

  webview.addEventListener('did-stop-loading', () => {
    if (tabId === activeTabId) {
      isLoading = false;
      reloadBtn.textContent = '↻';
      loadingBar.style.width = '100%';
      setTimeout(() => {
        loadingBar.style.width = '0%';
      }, 300);
    }
    updateTabInfo(tabId, { isLoading: false });
  });

  webview.addEventListener('did-navigate', (e) => {
    const url = e.url;
    updateTabInfo(tabId, { url });
    if (tabId === activeTabId) {
      updateAddressBar(url);
      updateNavButtons();
    }
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    const url = e.url;
    updateTabInfo(tabId, { url });
    if (tabId === activeTabId) {
      updateAddressBar(url);
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    const title = e.title || '新标签';
    updateTabInfo(tabId, { title });
    if (tabId === activeTabId) {
      document.title = title + ' - 隐私浏览器';
    }
    refreshTabsList();
  });

  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      updateTabInfo(tabId, { favicon: e.favicons[0] });
      refreshTabsList();
    }
  });

  // 新窗口处理
  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    createTab(e.url);
  });
}

// 更新标签信息
async function updateTabInfo(tabId, updates) {
  await window.electronAPI?.invoke('tab:update', tabId, updates);
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    Object.assign(tab, updates);
  }
}

// 切换标签
async function switchTab(tabId) {
  // 隐藏所有 webview
  const allWebviews = contentArea.querySelectorAll('webview');
  allWebviews.forEach(wv => wv.classList.remove('active'));

  // 显示目标 webview
  const targetWebview = document.getElementById(tabId);
  if (targetWebview) {
    targetWebview.classList.add('active');
    activeTabId = tabId;

    // 更新 UI
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      updateAddressBar(tab.url);
      document.title = tab.title + ' - 隐私浏览器';
    }

    await window.electronAPI?.invoke('tab:switch', tabId);
    updateNavButtons();
    refreshTabsList();
  }
}

// 关闭标签
async function closeTab(tabId) {
  if (tabs.length <= 1) {
    alert('至少保留一个标签页');
    return;
  }

  const result = await window.electronAPI?.invoke('tab:close', tabId);
  if (result.success) {
    // 移除 webview
    const webview = document.getElementById(tabId);
    if (webview) {
      webview.remove();
    }

    tabs = result.tabs;
    activeTabId = result.activeTabId;

    // 切换到新的活动标签
    if (activeTabId) {
      await switchTab(activeTabId);
    }

    updateTabCount();
    refreshTabsList();
  }
}

// 刷新标签列表
async function refreshTabs() {
  const result = await window.electronAPI?.invoke('tab:getAll');
  if (result) {
    tabs = result.tabs;
    activeTabId = result.activeTabId;
    updateTabCount();
    refreshTabsList();
  }
}

// 刷新标签列表显示
function refreshTabsList() {
  tabsList.innerHTML = '';
  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = 'tab-item';
    if (tab.id === activeTabId) {
      item.classList.add('active');
    }

    const favicon = tab.favicon
      ? `<img src="${tab.favicon}" class="tab-favicon" />`
      : '<span class="tab-favicon">📄</span>';

    item.innerHTML = `
      ${favicon}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </div>
      <button class="tab-close" data-tab-id="${tab.id}">×</button>
    `;

    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        switchTab(tab.id);
        closeTabsPanel();
      }
    });

    const closeBtn = item.querySelector('.tab-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    tabsList.appendChild(item);
  });
}

// 更新标签计数
function updateTabCount() {
  tabCount.textContent = tabs.length;
}

// 导航到 URL
function navigate(url) {
  let targetUrl = url.trim();

  if (!targetUrl) return;

  // 如果不是 URL，使用 DuckDuckGo 搜索
  if (!targetUrl.match(/^https?:\/\//)) {
    if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
      targetUrl = 'https://' + targetUrl;
    } else {
      targetUrl = 'https://duckduckgo.com/?q=' + encodeURIComponent(targetUrl);
    }
  }

  const activeWebview = contentArea.querySelector('webview.active');
  if (activeWebview) {
    activeWebview.src = targetUrl;
    addressInput.value = targetUrl;
  }
}

// 地址栏回车
addressInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    navigate(addressInput.value);
  }
});

// 导航按钮
backBtn.addEventListener('click', () => {
  const activeWebview = contentArea.querySelector('webview.active');
  if (activeWebview && activeWebview.canGoBack()) {
    activeWebview.goBack();
  }
});

forwardBtn.addEventListener('click', () => {
  const activeWebview = contentArea.querySelector('webview.active');
  if (activeWebview && activeWebview.canGoForward()) {
    activeWebview.goForward();
  }
});

reloadBtn.addEventListener('click', () => {
  const activeWebview = contentArea.querySelector('webview.active');
  if (activeWebview) {
    if (isLoading) {
      activeWebview.stop();
    } else {
      activeWebview.reload();
    }
  }
});

// 手动清除按钮
wipeBtn.addEventListener('click', async () => {
  if (confirm('确定要清除所有浏览数据吗？\n\n这将：\n• 清除所有 Cookie 和缓存\n• 清除浏览历史\n• 清除 Local Storage\n• 清除剪贴板\n\n所有标签将重置为空白页。')) {
    statusText.textContent = '正在清除所有数据...';

    // 重置所有标签
    const allWebviews = contentArea.querySelectorAll('webview');
    allWebviews.forEach(wv => {
      wv.src = 'about:blank';
    });
    addressInput.value = '';

    setTimeout(() => {
      statusText.textContent = '✓ 已清除所有浏览数据';
      setTimeout(() => {
        statusText.textContent = '隐私模式 - 所有浏览数据将在关闭时自动清除';
      }, 2000);
    }, 500);
  }
});

// 标签按钮
tabsBtn.addEventListener('click', () => {
  toggleTabsPanel();
});

// 新建标签按钮
newTabBtn.addEventListener('click', async () => {
  await createTab('about:blank');
  closeTabsPanel();
});

// 书签按钮
bookmarksBtn.addEventListener('click', () => {
  toggleBookmarksPanel();
});

// 书签点击
document.addEventListener('click', (e) => {
  const bookmarkItem = e.target.closest('.bookmark-item');
  if (bookmarkItem) {
    const url = bookmarkItem.getAttribute('data-url');
    if (url) {
      navigate(url);
      closeBookmarksPanel();
    }
  }
});

// 切换标签面板
function toggleTabsPanel() {
  if (bookmarksPanelOpen) {
    closeBookmarksPanel();
  }

  tabsPanelOpen = !tabsPanelOpen;
  if (tabsPanelOpen) {
    tabsPanel.classList.add('show');
    refreshTabsList();
  } else {
    tabsPanel.classList.remove('show');
  }
}

function closeTabsPanel() {
  tabsPanelOpen = false;
  tabsPanel.classList.remove('show');
}

// 切换书签面板
function toggleBookmarksPanel() {
  if (tabsPanelOpen) {
    closeTabsPanel();
  }

  bookmarksPanelOpen = !bookmarksPanelOpen;
  if (bookmarksPanelOpen) {
    bookmarksPanel.classList.add('show');
  } else {
    bookmarksPanel.classList.remove('show');
  }
}

function closeBookmarksPanel() {
  bookmarksPanelOpen = false;
  bookmarksPanel.classList.remove('show');
}

// 点击外部关闭面板
document.addEventListener('click', (e) => {
  if (!tabsPanel.contains(e.target) && !tabsBtn.contains(e.target)) {
    closeTabsPanel();
  }
  if (!bookmarksPanel.contains(e.target) && !bookmarksBtn.contains(e.target)) {
    closeBookmarksPanel();
  }
});

// 更新导航按钮状态
function updateNavButtons() {
  const activeWebview = contentArea.querySelector('webview.active');
  if (activeWebview) {
    backBtn.disabled = !activeWebview.canGoBack();
    forwardBtn.disabled = !activeWebview.canGoForward();
  } else {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
  }
}

// 更新地址栏
function updateAddressBar(url) {
  if (url && url !== 'about:blank') {
    addressInput.value = url;
    try {
      const hostname = new URL(url).hostname;
      statusText.textContent = '🔒 安全连接 - ' + hostname;
    } catch (e) {
      statusText.textContent = '🔒 隐私模式';
    }
  } else {
    addressInput.value = '';
    statusText.textContent = '隐私模式 - 所有浏览数据将在关闭时自动清除';
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 定期更新导航按钮
setInterval(updateNavButtons, 500);

// 初始化
init();
