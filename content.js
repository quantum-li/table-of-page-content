let toc, observer;

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
  let startX, startY, startWidth, startHeight;
  let lastUpdateTime = 0;
  const THROTTLE_DELAY = 16; // 约60fps

// 添加错误边界处理的 generateTOC 函数
function generateTOC() {
  try {
    cleanup(); // 确保清理旧实例
    if (!document.body) {
      throw new Error('Document body not found');
    }
    toc = document.createElement('div');
    toc.id = 'extension-toc';
    toc.innerHTML = `
      <div class="toc-header">
        <h2>Table of Contents</h2>
        <button class="toc-toggle">-</button>
      </div>
      <div class="toc-content"></div>
    `;
    document.body.appendChild(toc);

    const tocContent = toc.querySelector('.toc-content');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

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

    makeTOCDraggable();
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
  } catch (error) {
    console.error('Error generating TOC:', error);
    cleanup(); // 确保出错时也能清理
  }
}

function updateTOC() {
  if (!toc) return;
  const tocContent = toc.querySelector('.toc-content');
  if (!tocContent) return;

  // 使用 DocumentFragment 优化批量 DOM 操作
  const fragment = document.createDocumentFragment();
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  // 缓存计算结果
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
      
      // 使用事件委托替代多个事件监听器
      link.dataset.headingId = id;
      fragment.appendChild(link);
  }
  });

  // 一次性更新 DOM
  tocContent.innerHTML = '';
  tocContent.appendChild(fragment);
    }

function makeTOCDraggable() {
  if (!toc) return;
  
  const moveHandler = (e) => {
    if (isDragging) {
      requestAnimationFrame(() => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
  if (toc) {
          toc.style.left = `${startLeft + deltaX}px`;
          toc.style.top = `${startTop + deltaY}px`;
        }
      });
    }
  };

  const upHandler = () => {
    isDragging = false;
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
  };

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.toc-header')) {
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

function makeTOCResizable() {
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
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toc-close';
  closeBtn.textContent = 'X';
  toc.querySelector('.toc-header').appendChild(closeBtn);
  closeBtn.addEventListener('click', cleanup);
    }

function cleanup() {
  try {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (toc) {
      // 移除所有事件监听器
      const tocContent = toc.querySelector('.toc-content');
      if (tocContent) {
        const links = tocContent.getElementsByTagName('a');
        Array.from(links).forEach(link => {
          const newLink = link.cloneNode(true);
          link.parentNode.replaceChild(newLink, link);
        });
      }

      // 移除 TOC 元素
      toc.remove();
      toc = null;
    }

    // 重置所有状态变量
    isDragging = false;
    isResizing = false;
    startX = startY = startWidth = startHeight = null;
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
      updateTOC();
    }
  }, 250);

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
  if (request.action === "generateTOC") {
    generateTOC();
      sendResponse({ success: true });
  }
  } catch (error) {
    console.error('Message listener error:', error);
    sendResponse({ success: false, error: error.message });
  }
  return true; // 保持消息通道开放
});