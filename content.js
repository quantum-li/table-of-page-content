let toc, observer, lastTOCContent;

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 全局变量声明和初始化
  let isDragging = false;
  let isResizing = false;
  let startX, startY, startWidth, startHeight, startLeft, startTop;
  let lastUpdateTime = 0;
  const THROTTLE_DELAY = 16; // 约60fps

// 添加错误边界处理的 generateTOC 函数
function generateTOC() {
  try {
    cleanup(); // 确保清理旧实例
    if (!document.body) {
      throw new Error('Document body not found');
    }

    // 创建备份容器
    const backupContainer = document.createElement('div');
    backupContainer.style.display = 'none';
    document.body.appendChild(backupContainer);

    toc = document.createElement('div');
    toc.id = 'extension-toc';
    
    // 添加错误边界处理
    const errorBoundary = document.createElement('div');
    errorBoundary.className = 'toc-error-boundary';
    errorBoundary.style.display = 'none';
    toc.appendChild(errorBoundary);

    toc.innerHTML = `
      <div class="toc-header">
        <h2>Table of Contents</h2>
        <div class="toc-controls">
          <button class="toc-toggle">-</button>
          <button class="toc-refresh" title="Refresh">↻</button>
        </div>
      </div>
      <div class="toc-content"></div>
    `;

    document.body.appendChild(toc);

    // 设置自动保存状态
    const autoSave = debounce(saveState, 1000);
    const resizeObserver = new ResizeObserver(() => {
      autoSave();
    });
    resizeObserver.observe(toc);

    // 恢复之前的状态
    restoreState(() => {
      setupTOCContent();
      setupEventListeners();
    });
  } catch (error) {
    console.error('Error generating TOC:', error);
    attemptRecovery();
  }
}

function updateTOC(content) {
  if (!toc) return;
  const tocContent = toc.querySelector('.toc-content');
  if (!tocContent) return;

  const fragment = document.createDocumentFragment();
  const headings = content.split('||').map(item => {
    const [level, text] = item.split('|');
    return { level: parseInt(level), text };
});
  headings.forEach((heading, index) => {
    const id = `toc-heading-${index}`;
      const link = document.createElement('a');
      link.href = `#${id}`;
    link.textContent = heading.text;
    link.style.paddingLeft = `${(heading.level - 1) * 15}px`;
      link.dataset.headingId = id;
      fragment.appendChild(link);
  });

  tocContent.innerHTML = '';
  tocContent.appendChild(fragment);
    }

function makeTOCDraggable() {
  if (!toc) return;
  
  const moveHandler = (e) => {
    if (isDragging && toc) {
      requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
          toc.style.left = `${startLeft + deltaX}px`;
          toc.style.top = `${startTop + deltaY}px`;
      });
    }
  };

  const upHandler = () => {
    isDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
  };

  const headerElement = toc.querySelector('.toc-header');
  if (headerElement) {
    headerElement.addEventListener('mousedown', (e) => {
    if (toc) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = toc.offsetLeft;
        startTop = toc.offsetTop;

        document.addEventListener('mousemove', moveHandler, { passive: true });
        document.addEventListener('mouseup', upHandler, { passive: true });
      }
    }, { passive: true });
  }
}

function makeTOCResizable() {
  if (!toc) return;
  const resizer = document.createElement('div');
  resizer.className = 'toc-resizer';
  toc.appendChild(resizer);

  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  let lastUpdateTime = 0;
  const THROTTLE_DELAY = 16; // 约60fps

  // 添加防止文本选中的函数
  const preventSelection = (e) => {
    e.preventDefault();
    return false;
  };

  // 优化的大小调整处理函数
  const updateSize = (e) => {
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < THROTTLE_DELAY) return;
    lastUpdateTime = currentTime;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

    // 计算新的尺寸
    const minWidth = 200;
    const minHeight = toc.classList.contains('collapsed') 
      ? toc.querySelector('.toc-header').offsetHeight 
      : 100;
    const maxWidth = window.innerWidth - toc.offsetLeft - 20;
    const maxHeight = window.innerHeight - toc.offsetTop - 20;
      const newWidth = Math.min(Math.max(startWidth + deltaX, minWidth), maxWidth);
      const newHeight = Math.min(Math.max(startHeight + deltaY, minHeight), maxHeight);

    // 直接更新样式，不使用 requestAnimationFrame
      toc.style.width = `${newWidth}px`;
      
      if (!toc.classList.contains('collapsed')) {
      toc.style.height = `${newHeight}px`;
      const tocContent = toc.querySelector('.toc-content');
      if (tocContent) {
        const headerHeight = toc.querySelector('.toc-header').offsetHeight;
        tocContent.style.maxHeight = `${newHeight - headerHeight}px`;
      }
      }
  };
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = toc.offsetWidth;
    startHeight = toc.offsetHeight;
    // 添加防止文本选中的事件监听器
    document.addEventListener('selectstart', preventSelection);
    
    // 添加临时样式
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'se-resize';
    
    e.preventDefault();
  }, { passive: false });

  // 使用节流处理的 mousemove 事件
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    updateSize(e);
  }, { passive: true });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    
    // 移除防止文本选中的事件监听器
    document.removeEventListener('selectstart', preventSelection);
    
    // 恢复样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, { passive: true });
}

function setupTOCToggle() {
  if (!toc) return;
  const toggleBtn = toc.querySelector('.toc-toggle');
  const tocContent = toc.querySelector('.toc-content');
  const tocHeader = toc.querySelector('.toc-header');

  toggleBtn.addEventListener('click', () => {
    toc.classList.toggle('collapsed');
    const isCollapsed = toc.classList.contains('collapsed');
    toggleBtn.textContent = isCollapsed ? '+' : '-';
    if (isCollapsed) {
      const headerHeight = tocHeader.offsetHeight;
      toc.style.height = `${headerHeight}px`;
    } else {
      toc.style.height = '';  // 恢复原始高度
      tocContent.style.maxHeight = `calc(80vh - ${tocHeader.offsetHeight}px)`;
}
  });
  }

function setupTOCClose() {
  if (!toc) return;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toc-close';
  closeBtn.textContent = 'X';
  toc.querySelector('.toc-header').appendChild(closeBtn);
  closeBtn.addEventListener('click', cleanup);
    }

function cleanup() {
  try {
    if (toc) {
      saveState(); // 保存状态before清理
    }

    if (observer) {
    observer.disconnect();
      observer = null;
  }

      if (toc) {
      const clone = toc.cloneNode(true);
      toc.parentNode.replaceChild(clone, toc);
      clone.remove();
      toc = null;
    }

    // 重置所有状态变量
    isDragging = false;
    isResizing = false;
    startX = startY = startWidth = startHeight = startLeft = startTop = null;
    lastTOCContent = null;
    isInitialized = false;
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

function setupMutationObserver() {
  if (observer) {
    observer.disconnect();
  }

  const debouncedUpdate = debounce(() => {
    if (document.body) {
      const newContent = generateTOCContent();
      if (newContent !== lastTOCContent) {
        lastTOCContent = newContent;
        updateTOC(newContent);
        showUpdateAnimation();
    }
    }
  }, 1000); // 将防抖时间改为1秒
  observer = new MutationObserver((mutations) => {
  try {
      const needsUpdate = mutations.some(mutation => {
        if (!mutation.target || !mutation.target.parentElement) return false;
        
        return mutation.type === 'childList' || 
               (mutation.type === 'characterData' && 
                /^H[1-6]$/i.test(mutation.target.parentElement.tagName));
});

      if (needsUpdate) {
        debouncedUpdate();
      }
  } catch (error) {
      console.error('MutationObserver error:', error);
  }
  });

  try {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false
    });
  } catch (error) {
    console.error('Failed to setup MutationObserver:', error);
}
  }

function generateTOCContent() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(heading => !toc.contains(heading));
  
  return headings.map(heading => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    return `${level}|${text}`;
  }).join('||');
}

function showUpdateAnimation() {
  const tocHeader = toc.querySelector('.toc-header');
  const animationBar = document.createElement('div');
  animationBar.className = 'toc-update-animation';
  tocHeader.appendChild(animationBar);
  setTimeout(() => {
    animationBar.remove();
  }, 2000); // 动画持续2秒
    }

// 添加状态持久化
function saveState() {
  if (!toc) return;
  const state = {
    position: {
      left: toc.style.left,
      top: toc.style.top,
      width: toc.style.width,
      height: toc.style.height
    },
    isCollapsed: toc.classList.contains('collapsed'),
    lastUpdate: Date.now()
  };
  chrome.storage.local.set({ tocState: state });
}

// 恢复状态
function restoreState(callback) {
  chrome.storage.local.get(['tocState'], (result) => {
    if (result.tocState && Date.now() - result.tocState.lastUpdate < 3600000) { // 1小时内的状态
      if (toc) {
        const { position, isCollapsed } = result.tocState;
        toc.style.left = position.left;
        toc.style.top = position.top;
        toc.style.width = position.width;
        toc.style.height = position.height;
        if (isCollapsed) {
          toc.classList.add('collapsed');
          const toggleBtn = toc.querySelector('.toc-toggle');
          if (toggleBtn) toggleBtn.textContent = '+';
        }
      }
    }
    if (callback) callback();
  });
}

// 添加在文件开头
let isInitialized = false;

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
  if (request.action === "checkReady") {
      sendResponse({ status: "ready", initialized: isInitialized });
  return true;
    } else if (request.action === "generateTOC") {
      generateTOC();
      isInitialized = true;
      sendResponse({ status: "success", message: "TOC generated" });
      return true;
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ status: "error", message: error.message });
    return true;
  }
});

function setupTOCContent() {
  const tocContent = toc.querySelector('.toc-content');
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter(heading => !toc.contains(heading)); // 排除扩展程序自身的标题
  
    // 使用 DocumentFragment 优化批量 DOM 操作
    const fragment = document.createDocumentFragment();
    const cachedLinks = new Map();

    headings.forEach((heading, index) => {
      const id = `toc-heading-${index}`;
      
      // 检查缓存
      if (cachedLinks.has(heading.textContent)) {
        const cachedLink = cachedLinks.get(heading.textContent).cloneNode(true);
        cachedLink.href = `#${id}`;
        cachedLink.dataset.headingId = id;
        fragment.appendChild(cachedLink);
      } else {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
      heading.id = id;

      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = text;
      link.style.paddingLeft = `${(level - 1) * 15}px`;
      link.dataset.headingId = id;
        
        // 存入缓存
        cachedLinks.set(text, link.cloneNode(true));
        fragment.appendChild(link);
}
    });

    // 一次性更新 DOM
    tocContent.innerHTML = '';
    tocContent.appendChild(fragment);

    makeTOCResizable();
    setupTOCToggle();
    setupTOCClose();

    // 设置初始最大高度
  const tocHeader = toc.querySelector('.toc-header');
    if (tocContent && tocHeader) {
      tocContent.style.maxHeight = `calc(80vh - ${tocHeader.offsetHeight}px)`;
}

    // 使用事件委托处理点击事件
    tocContent.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const heading = document.getElementById(e.target.dataset.headingId);
        if (heading) {
          heading.scrollIntoView({ behavior: 'smooth' });
}
      }
});

    // 使用防抖处理 MutationObserver
    setupMutationObserver();

    lastTOCContent = generateTOCContent();
    updateTOC(lastTOCContent);
}

function setupEventListeners() {
  // 添加错误监听
  window.addEventListener('error', (event) => {
    if (event.target === toc || toc.contains(event.target)) {
      console.error('TOC error detected:', event);
      attemptRecovery();
    }
  }, true);

  // 添加刷新按钮事件
  const refreshBtn = toc.querySelector('.toc-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      generateTOC();
    });
  }
}
function attemptRecovery() {
  try {
    cleanup();
    console.log('Attempting to recover TOC...');
    
    // 等待一段时间后重试
    setTimeout(() => {
      generateTOC();
    }, 2000);
    
  } catch (error) {
    console.error('Recovery failed:', error);
  }
}

function setupHealthCheck() {
  setInterval(() => {
    if (!toc || !document.body.contains(toc)) {
      console.log('TOC not found, attempting recovery...');
      generateTOC();
    }
  }, 5000); // 每5秒检查一次
}

// 添加到 CSS
const styles = `
.toc-refresh {
  background: none;
  border: none;
  font-size: 18px;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.toc-refresh:hover {
  transform: rotate(180deg);
}

.toc-error-boundary {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 0, 0, 0.1);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
`;

// 将样式添加到文档中
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);