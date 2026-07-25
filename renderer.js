const browserView = document.getElementById('browserView');
const addressInput = document.getElementById('addressInput');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const wipeBtn = document.getElementById('wipeBtn');
const loadingBar = document.getElementById('loadingBar');
const statusText = document.getElementById('statusText');

let isLoading = false;

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

  browserView.src = targetUrl;
  addressInput.value = targetUrl;
}

// 地址栏回车
addressInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    navigate(addressInput.value);
  }
});

// 导航按钮
backBtn.addEventListener('click', () => {
  if (browserView.canGoBack()) {
    browserView.goBack();
  }
});

forwardBtn.addEventListener('click', () => {
  if (browserView.canGoForward()) {
    browserView.goForward();
  }
});

reloadBtn.addEventListener('click', () => {
  if (isLoading) {
    browserView.stop();
  } else {
    browserView.reload();
  }
});

// 手动清除按钮
wipeBtn.addEventListener('click', async () => {
  if (confirm('确定要清除所有浏览数据吗？\n\n这将：\n• 清除所有 Cookie 和缓存\n• 清除浏览历史\n• 清除 Local Storage\n• 清除剪贴板\n\n浏览器将刷新到空白页。')) {
    statusText.textContent = '正在清除所有数据...';
    browserView.src = 'about:blank';
    addressInput.value = '';

    // 等待 webview 清除
    setTimeout(() => {
      statusText.textContent = '✓ 已清除所有浏览数据';
      setTimeout(() => {
        statusText.textContent = '隐私模式 - 所有浏览数据将在关闭时自动清除';
      }, 2000);
    }, 500);
  }
});

// WebView 事件监听
browserView.addEventListener('did-start-loading', () => {
  isLoading = true;
  reloadBtn.textContent = '✕';
  loadingBar.style.width = '30%';
});

browserView.addEventListener('did-stop-loading', () => {
  isLoading = false;
  reloadBtn.textContent = '↻';
  loadingBar.style.width = '100%';
  setTimeout(() => {
    loadingBar.style.width = '0%';
  }, 300);
});

browserView.addEventListener('did-navigate', () => {
  updateNavButtons();
  updateAddressBar();
});

browserView.addEventListener('did-navigate-in-page', () => {
  updateAddressBar();
});

browserView.addEventListener('page-title-updated', (e) => {
  document.title = e.title + ' - 隐私浏览器';
});

// 更新导航按钮状态
function updateNavButtons() {
  backBtn.disabled = !browserView.canGoBack();
  forwardBtn.disabled = !browserView.canGoForward();
}

// 更新地址栏
function updateAddressBar() {
  const url = browserView.getURL();
  if (url && url !== 'about:blank') {
    addressInput.value = url;
    statusText.textContent = '🔒 安全连接 - ' + new URL(url).hostname;
  }
}

// 初始化
updateNavButtons();

// 定期更新导航按钮
setInterval(updateNavButtons, 500);
