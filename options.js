document.addEventListener('DOMContentLoaded', () => {
  const blacklistTextarea = document.getElementById('blacklist');
  const saveButton = document.getElementById('save');
  const statusElement = document.getElementById('status');

  // 加载已保存的黑名单
  chrome.storage.sync.get('blacklist', (data) => {
    blacklistTextarea.value = (data.blacklist || []).join('\n');
  });

  saveButton.addEventListener('click', () => {
    const blacklist = blacklistTextarea.value.split('\n').filter(url => url.trim() !== '');
    chrome.storage.sync.set({ blacklist }, () => {
      statusElement.textContent = '设置已保存';
      statusElement.style.opacity = '1';
      setTimeout(() => {
        statusElement.style.opacity = '0';
      }, 2000);
    });
  });
});
