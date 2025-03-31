document.addEventListener('DOMContentLoaded', () => {
  // 加载设置
  loadSettings();

  // 保存按钮
  document.getElementById('save').addEventListener('click', saveSettings);

  // 重置按钮
  document.getElementById('reset').addEventListener('click', resetSettings);
});

function loadSettings() {
  chrome.storage.sync.get({
    fontSize: '14px',
    theme: 'light'
  }, (items) => {
    document.getElementById('fontSize').value = items.fontSize;
    document.getElementById('theme').value = items.theme;
  });
}
    
function saveSettings() {
  const settings = {
    fontSize: document.getElementById('fontSize').value,
    theme: document.getElementById('theme').value
  };

  chrome.storage.sync.set(settings, () => {
    showStatus('设置已保存', 'success');
  });
}

function resetSettings() {
  const defaultSettings = {
    fontSize: '14px',
    theme: 'light'
  };

  chrome.storage.sync.set(defaultSettings, () => {
    loadSettings();
    showStatus('设置已重置为默认值', 'success');
  });
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
}
