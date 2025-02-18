// 在文件顶部添加变量声明
let tocClosed = false;
    let isDragging = false;
    let isResizing = false;

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

  // 再次检查是否在黑名单中
  const shouldCreateTOC = await checkAndInitTOC();
  if (!shouldCreateTOC) {
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
        const width = Math.max(200, startWidth + (e.clientX - startX));  // 限制最小宽度
        const height = Math.max(100, startHeight + (e.clientY - startY)); // 限制最小高度
    // 保存当前滚动位置
  const content = toc.querySelector('.page-toc-content');
    const scrollTop = content.scrollTop;
    
        toc.style.width = `${width}px`;
        toc.style.height = `${height}px`;
    // 恢复滚动位置
    content.scrollTop = scrollTop;
    adjustTocContentHeight();
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

  // 在目录创建完成后调用
  adjustTocContentHeight();

  // 监听窗口大小变化，调整目录内容高度
  window.addEventListener('resize', adjustTocContentHeight);
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

// MutationObserver 逻辑
const observer = new MutationObserver(debounce(async (mutations) => {
  if (tocClosed) return; // 现在可以正确访问 tocClosed 变量

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
}, 500));
// 配置观察选项，观察整个文档
observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src']
});

function isUrlInBlacklist(url, blacklist) {
  try {
  const hostname = new URL(url).hostname;
    console.log('检查域名:', hostname);

    for (const pattern of blacklist) {
      console.log('对比正则:', pattern);
      
      try {
        const regex = new RegExp(pattern);
      const matches = regex.test(hostname);
        console.log('是否匹配:', matches);
      if (matches) return true;
      } catch (regexError) {
        console.error('无效的正则表达式:', pattern, regexError);
        continue;
  }
    }
    
    return false;
  } catch (e) {
    console.error('URL检查出错:', e);
    return false;
}
}

// 将黑名单检查移到函数中
function checkAndInitTOC() {
  console.log('=== 开始检查黑名单 ===');
  return new Promise((resolve) => {
chrome.storage.sync.get('blacklist', (data) => {
  const blacklist = data.blacklist || [];
  const currentUrl = window.location.href;
    const hostname = new URL(currentUrl).hostname;
  
    console.log('当前网址:', currentUrl);
    console.log('当前域名:', hostname);
    console.log('黑名单列表:', blacklist);
    
    const isBlocked = isUrlInBlacklist(currentUrl, blacklist);
    console.log('是否在黑名单中:', isBlocked);
    
    if (!isBlocked) {
      console.log('网站未被屏蔽，创建目录');
        resolve(true);
    } else {
      console.log('网站已被屏蔽，不创建目录');
      // 确保移除已存在的目录
      const existingToc = document.querySelector('.page-toc');
      if (existingToc) {
        existingToc.remove();
  }
        resolve(false);
}
});
  });
}

// 将消息监听器移到文档加载完成后
document.addEventListener('DOMContentLoaded', async () => {
  console.log('页面加载完成，执行检查');
  const shouldInitTOC = await checkAndInitTOC();
  if (shouldInitTOC) {
    initTOC();
  }
  });

// 也可以考虑在 window.onload 事件中再次检查
window.addEventListener('load', async () => {
  console.log('页面完全加载，再次执行检查');
  const shouldInitTOC = await checkAndInitTOC();
  if (shouldInitTOC) {
    initTOC();
  }
  });

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync' && changes.blacklist) {
    console.log('黑名单已更新');
    console.log('旧值:', changes.blacklist.oldValue);
    console.log('新值:', changes.blacklist.newValue);
    const shouldInitTOC = await checkAndInitTOC();
    if (shouldInitTOC) {
      initTOC();
    } else {
      // 如果在黑名单中，移除现有的目录
      const existingToc = document.querySelector('.page-toc');
      if (existingToc) {
        existingToc.remove();
  }
    }
  }
  });
function initTOC() {
  tocClosed = false; // 重置标志
  createTOC(); // 直接调用 createTOC，不需要 setTimeout
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

function adjustTocContentHeight() {
  const toc = document.querySelector('.page-toc');
  const header = toc.querySelector('.page-toc-header');
  const content = toc.querySelector('.page-toc-content');
  
  if (toc && header && content) {
    // 保存当前滚动位置
    const scrollTop = content.scrollTop;
    
    const tocHeight = toc.offsetHeight;
    const headerHeight = header.offsetHeight;
    content.style.height = `${tocHeight - headerHeight - 20}px`; // 减去padding
    
    // 恢复滚动位置
    content.scrollTop = scrollTop;
  }
}

// 在拖拽和调整大小结束后调用此函数
document.addEventListener('mouseup', () => {
  if (isDragging || isResizing) {
    isDragging = false;
    isResizing = false;
    adjustTocContentHeight();
  }
});