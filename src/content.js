class TOCGenerator {
  constructor() {
    this.toc = null;
    this.settings = {
      fontSize: '14px',
      theme: 'light'
    };
    this.isDragging = false;
    this.isResizing = false;
    this.dragOffset = { x: 0, y: 0 };
    this.init();
  }

  async init() {
    // 加载用户设置
    this.settings = await chrome.storage.sync.get({
      fontSize: '14px',
      theme: 'light'
    });
    
    // 监听设置变化
    chrome.storage.onChanged.addListener((changes) => {
      for (let key in changes) {
        this.settings[key] = changes[key].newValue;
        this.updateStyles();
      }
    });
  }

  createTOCContainer() {
    if (this.toc) {
      this.toc.style.display = 'block';
      return;
    }

    this.toc = document.createElement('div');
    this.toc.id = 'page-toc-container';
    this.toc.innerHTML = `
      <div class="toc-header">
        <div class="toc-left">
          <span class="toc-title">目录</span>
          <div class="quick-controls">
            <select class="quick-font-size" title="字体大小">
              <option value="12px">小</option>
              <option value="14px">中</option>
              <option value="16px">大</option>
            </select>
            <select class="quick-theme" title="主题">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="sepia">护眼</option>
              <option value="nord">Nord</option>
              <option value="dracula">Dracula</option>
            </select>
        </div>
      </div>
        <div class="toc-controls">
          <i class="toc-icon refresh" title="刷新">↻</i>
          <i class="toc-icon toggle" title="折叠">−</i>
          <i class="toc-icon close" title="关闭">×</i>
        </div>
      </div>
      <div class="toc-content"></div>
      <div class="toc-resize-handle-left"></div>
      <div class="toc-resize-handle-right"></div>
    `;

    // 初始化快捷控件的值
    const quickFontSize = this.toc.querySelector('.quick-font-size');
    const quickTheme = this.toc.querySelector('.quick-theme');
    quickFontSize.value = this.settings.fontSize;
    quickTheme.value = this.settings.theme;

    this.setupEventListeners();
    this.makeDraggable();
    this.makeResizable();
    this.updateStyles();
    
    document.body.appendChild(this.toc);
  }

  setupEventListeners() {
    const controls = this.toc.querySelector('.toc-controls');
    controls.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('refresh')) {
        this.generateTOC();
      } else if (target.classList.contains('toggle')) {
        this.toggleTOC();
      } else if (target.classList.contains('close')) {
        this.closeTOC();
      }
    });

    // 点击目录项时滚动到对应位置
    this.toc.querySelector('.toc-content').addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').slice(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    // 快捷字体大小切换
    const quickFontSize = this.toc.querySelector('.quick-font-size');
    quickFontSize.addEventListener('change', (e) => {
      const newSize = e.target.value;
      this.settings.fontSize = newSize;
      chrome.storage.sync.set({ fontSize: newSize });
    });

    // 快捷主题切换
    const quickTheme = this.toc.querySelector('.quick-theme');
    quickTheme.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      this.settings.theme = newTheme;
      chrome.storage.sync.set({ theme: newTheme });
    });
  }

  generateTOC() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const tocContent = this.toc.querySelector('.toc-content');
    tocContent.innerHTML = '';

    if (headings.length === 0) {
      tocContent.innerHTML = '<div class="toc-empty">未找到标题内容</div>';
      return;
    }

    const toc = document.createElement('ul');
    const stack = [{ level: 0, element: toc }];

    headings.forEach((heading, index) => {
      // 确保heading有id
      if (!heading.id) {
        heading.id = `toc-heading-${index}`;
      }

      const level = parseInt(heading.tagName.substring(1));
      const item = document.createElement('li');
      item.className = `toc-item level-${level}`;
      
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.appendChild(link);

      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (level > stack[stack.length - 1].level) {
        const ul = document.createElement('ul');
        stack[stack.length - 1].element.appendChild(ul);
        stack.push({ level, element: ul });
      }

      stack[stack.length - 1].element.appendChild(item);
    });

    tocContent.appendChild(toc);
  }

  makeDraggable() {
    const header = this.toc.querySelector('.toc-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('toc-icon')) return;
      
      this.isDragging = true;
      const rect = this.toc.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      this.toc.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      
      this.toc.style.left = `${Math.max(0, Math.min(window.innerWidth - this.toc.offsetWidth, x))}px`;
      this.toc.style.top = `${Math.max(0, Math.min(window.innerHeight - this.toc.offsetHeight, y))}px`;
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.toc.style.transition = 'all 0.3s ease';
    });
  }

  makeResizable() {
    const handleRight = this.toc.querySelector('.toc-resize-handle-right');
    const handleLeft = this.toc.querySelector('.toc-resize-handle-left');
    let rafId = null;
    let initialRect, initialX;
    
    const startResize = (e, isLeft) => {
      this.isResizing = true;
      this.resizingLeft = isLeft;
      e.preventDefault();
      this.toc.style.transition = 'none';
      // 记录初始状态
      initialRect = this.toc.getBoundingClientRect();
      initialX = e.clientX;
    };

    const resize = (e) => {
      if (!this.isResizing) return;

      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const rect = this.toc.getBoundingClientRect();
        let width, left, height;

        if (this.resizingLeft) {
          // 计算鼠标移动的距离
          const deltaX = e.clientX - initialX;
          // 新宽度 = 初始宽度 - 移动距离
          width = Math.max(200, Math.min(600, initialRect.width - deltaX));
          // 新位置 = 初始位置 + (初始宽度 - 新宽度)
          left = initialRect.left + (initialRect.width - width);
    } else {
          width = e.clientX - rect.left;
          left = rect.left;
        }

        height = e.clientY - rect.top;
        
        // 限制最小/最大尺寸
        width = Math.max(200, Math.min(600, width));
        height = Math.max(150, Math.min(window.innerHeight * 0.8, height));

        this.toc.style.width = width + 'px';
        this.toc.style.height = height + 'px';
        
        if (this.resizingLeft) {
          this.toc.style.left = Math.min(window.innerWidth - width, Math.max(0, left)) + 'px';
        }
      });
    };

    const stopResize = () => {
      this.isResizing = false;
      this.resizingLeft = false;
      this.toc.style.transition = 'all 0.3s ease';
      if (rafId) cancelAnimationFrame(rafId);
    };

    handleRight.addEventListener('mousedown', (e) => startResize(e, false));
    handleLeft.addEventListener('mousedown', (e) => startResize(e, true));
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

  toggleTOC() {
    const content = this.toc.querySelector('.toc-content');
    const toggle = this.toc.querySelector('.toggle');
    const container = this.toc;
    const header = this.toc.querySelector('.toc-header');
    const handles = container.querySelectorAll('.toc-resize-handle-left, .toc-resize-handle-right');
    
    if (content.style.display === 'none') {
      // 展开
      content.style.display = 'block';
      toggle.textContent = '−';
      header.classList.remove('collapsed');
      container.style.height = container.dataset.originalHeight || 'auto';
      content.style.overflow = 'auto';
      handles.forEach(handle => handle.style.display = 'block');
      if (container.dataset.originalWidth) {
        container.style.width = container.dataset.originalWidth;
    }
    } else {
      // 折叠
      container.dataset.originalHeight = container.style.height || getComputedStyle(container).height;
      container.dataset.originalWidth = container.style.width || getComputedStyle(container).width;
      content.style.display = 'none';
      toggle.textContent = '+';
      header.classList.add('collapsed');
      container.style.height = '45px';
      container.style.width = '200px';
      handles.forEach(handle => handle.style.display = 'none');
      content.style.overflow = 'hidden';
  }
}

  closeTOC() {
    this.toc.style.display = 'none';
}

  updateStyles() {
    if (!this.toc) return;

    const { fontSize, theme } = this.settings;
    this.toc.style.fontSize = fontSize;

    // 重置所有样式
    this.toc.className = '';
      // 使用预定义主题
      this.toc.className = `theme-${theme}`;
  }
}

// 初始化
const tocGenerator = new TOCGenerator();

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateTOC') {
    tocGenerator.createTOCContainer();
    tocGenerator.generateTOC();
  }
});
