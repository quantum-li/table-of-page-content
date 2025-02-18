document.addEventListener('DOMContentLoaded', () => {
  const blacklistTextarea = document.getElementById('blacklist');
  const saveButton = document.getElementById('save');
  const statusElement = document.getElementById('status');

  // 加载已保存的黑名单
  chrome.storage.sync.get('blacklist', (data) => {
    blacklistTextarea.value = (data.blacklist || []).join('\n');
  });

  saveButton.addEventListener('click', () => {
    const blacklist = blacklistTextarea.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '')
      .map(url => {
        // 只处理完整 URL 的情况
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return '*.' + new URL(url).hostname;
        }
        // 其他情况保持原样
        return url;
      });

    console.log('保存黑名单:', blacklist);
    
    chrome.storage.sync.set({ blacklist }, () => {
      console.log('黑名单已保存');
      // 立即读取并验证
      chrome.storage.sync.get('blacklist', (data) => {
        console.log('验证已保存的黑名单:', data.blacklist);
      });
      statusElement.textContent = '设置已保存';
      statusElement.style.opacity = '1';
      
      setTimeout(() => {
        statusElement.style.opacity = '0';
      }, 2000);
    });
  });
});
