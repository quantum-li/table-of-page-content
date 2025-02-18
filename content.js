function waitForElement(selector, root, timeout = 2000) {
  return new Promise((resolve) => {
    if (root.querySelector(selector)) {
      return resolve(root.querySelector(selector));
    }
const observer = new MutationObserver(() => {
      if (root.querySelector(selector)) {
        observer.disconnect();
        resolve(root.querySelector(selector));
  }
});

    observer.observe(root, {
  childList: true,
  subtree: true
});

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

async function getAllHeadings(root) {
  let headings = [];
  
  // 获取主文档标题，包括 Google 搜索结果中的特殊标题
  headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6, .r, .rc .r, .g h3'));
  
  // 处理 iframe
  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      // 等待 iframe 加载完成
      await new Promise(resolve => {
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
          resolve();
        } else {
          iframe.onload = resolve;
        }
      });
      
      // 检查是否可以访问 iframe 的内容
      if (iframe.contentDocument && iframe.contentWindow) {
      const frameHeadings = Array.from(iframe.contentDocument.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      headings = headings.concat(frameHeadings);
    }
    } catch (e) {
      console.warn('无法访问iframe内容:', e);
    }
  }
  
  // 处理 micro-app
  const microApps = root.querySelectorAll('micro-app');
  for (const app of microApps) {
    try {
      // 等待 micro-app 加载
      const microAppRoot = await waitForElement('h1, h2, h3, h4, h5, h6', app.shadowRoot || app, 3000);
      
      if (microAppRoot) {
        const microAppHeadings = Array.from(microAppRoot.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        headings = headings.concat(microAppHeadings);
    }
    } catch (e) {
      console.warn('无法访问micro-app内容:', e);
  }
}

  // 处理 shadow DOM
  const shadowHosts = root.querySelectorAll('*');
  for (const host of shadowHosts) {
    if (host.shadowRoot) {
      const shadowHeadings = Array.from(host.shadowRoot.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      headings = headings.concat(shadowHeadings);
  }
  }

  return headings;
}

async function createTOC() {
  if (document.querySelector('.page-toc') || tocClosed) {
    return;
  }

  const toc = document.createElement('div');
  toc.className = 'page-toc';
  toc.style.display = 'none'; // 初始设置为隐藏
  
  // 添加标题栏
  const header = document.createElement('div');
  header.className = 'page-toc-header';
  
  const title = document.createElement('span');
  title.textContent = '目录';
  header.appendChild(title);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'page-toc-toggle';
  toggleBtn.textContent = '−'; // 使用减号表示展开状态
  header.appendChild(toggleBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'page-toc-close';
  closeBtn.textContent = '×';
  header.appendChild(closeBtn);

  toc.appendChild(header);

  const content = document.createElement('div');
  content.className = 'page-toc-content';
  toc.appendChild(content);

  // 等待并获取所有标题
  const headings = await getAllHeadings(document);
  
  // 如果没有找到任何标题，直接返回
  if (!headings || headings.length === 0) {
      return;
    }
    
  const ul = document.createElement('ul');
  const addedHeadings = new Set(); // 用于跟踪已添加的标题
  
  headings.forEach((heading, index) => {
    // 获取标题的可见文本内容
    const headingText = getVisibleText(heading);
    
    // 如果标题为空或只包含空白字符，则跳过
    if (!headingText.trim()) {
      return;
    }

    // 创建唯一标识符
    const headingIdentifier = headingText + '-' + heading.tagName;
    
    // 如果标题已经添加过，则跳过
    if (addedHeadings.has(headingIdentifier)) {
      return;
    }
    
    addedHeadings.add(headingIdentifier);

    if (!heading.id) {
      heading.id = `toc-heading-${index}`;
    }
    
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = headingText;
    a.style.paddingLeft = `${(parseInt(heading.tagName[1]) - 1) * 15}px`;
    
    a.addEventListener('click', (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth' });
    });
    
    li.appendChild(a);
    ul.appendChild(li);
  });
  
  // 只有在成功添加了目录项后才显示
  if (ul.children.length > 0) {
    content.appendChild(ul);
  document.body.appendChild(toc);
  
    // 确保所有内容都已正确加载后再显示
    requestAnimationFrame(() => {
      toc.style.display = 'block';
    });

    // 添加折叠功能
    toggleBtn.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
      toggleBtn.textContent = content.style.display === 'none' ? '+' : '−';
    });

    // 添加关闭功能
    closeBtn.addEventListener('click', () => {
      toc.remove();
      tocClosed = true; // 设置标志为 true
});

    // 实现拖拽移动和调整大小功能
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    
    toc.addEventListener('mousedown', (e) => {
      if (e.offsetX > toc.offsetWidth - 20 && e.offsetY > toc.offsetHeight - 20) {
        isResizing = true;
} else {
        isDragging = true;
}
      startX = e.clientX;
      startY = e.clientY;
      startWidth = toc.offsetWidth;
      startHeight = toc.offsetHeight;
      startLeft = toc.offsetLeft;
      startTop = toc.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging && !isResizing) return;
      
      if (isResizing) {
      const width = startWidth + (e.clientX - startX);
      const height = startHeight + (e.clientY - startY);
      
      toc.style.width = `${width}px`;
      toc.style.height = `${height}px`;
      } else if (isDragging) {
        const left = startLeft + (e.clientX - startX);
        const top = startTop + (e.clientY - startY);
        
        toc.style.left = `${left}px`;
        toc.style.top = `${top}px`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
    });
  }
}

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

// 修改 MutationObserver 逻辑
const observer = new MutationObserver(debounce(async (mutations) => {
  if (tocClosed) return; // 如果目录已关闭，直接返回

    const toc = document.querySelector('.page-toc');
  const hasNewContent = mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => {
      return node.nodeType === 1 && (
        node.querySelector('h1, h2, h3, h4, h5, h6, .r, .rc .r, .g h3') ||
        node.matches('iframe') ||
        node.matches('micro-app')
      );
    });
  });

  if (hasNewContent || !toc) {
    if (toc) {
      toc.remove();
    }
    await createTOC();
  }
}, 500)); // 500ms 的防抖延迟
// 配置观察选项，观察整个文档
observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src']
});

function isUrlInBlacklist(url, blacklist) {
  return blacklist.some(pattern => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(url);
  });
}

chrome.storage.sync.get('blacklist', (data) => {
  const blacklist = data.blacklist || [];
  const currentUrl = window.location.href;
  
  if (!isUrlInBlacklist(currentUrl, blacklist)) {
  initTOC();
}
});

let tocClosed = false; // 添加一个标志来跟踪目录是否被关闭

function initTOC() {
  tocClosed = false; // 重置标志
  setTimeout(async () => {
    await createTOC();
  }, 2000); // 保留延迟2秒创建目录，确保页面内容加载
    }

function getVisibleText(element) {
  // 如果元素是图片，返回其 alt 文本（如果有的话）
  if (element.tagName.toLowerCase() === 'img') {
    return element.alt || '';
  }

  // 对于其他元素，递归获取其可见文本
  let text = '';
  const style = window.getComputedStyle(element);
  
  // 检查元素是否可见
  if (style.display !== 'none' && style.visibility !== 'hidden') {
    // 遍历所有子节点
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        // 文本节点
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 元素节点，递归获取文本
        text += getVisibleText(node);
      }
    }
  }

  return text.trim();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reinitTOC") {
    initTOC();
  }
});