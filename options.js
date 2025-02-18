document.addEventListener('DOMContentLoaded', () => {
  const blacklistTextarea = document.getElementById('blacklist');
  const saveButton = document.getElementById('save');
  const statusElement = document.getElementById('status');

  // 加载已保存的黑名单
  chrome.storage.sync.get('blacklist', (data) => {
    blacklistTextarea.value = (data.blacklist || []).join('\n');
  });

  saveButton.addEventListener('click', () => {
    const patterns = blacklistTextarea.value
      .split('\n')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern !== '');

    // 验证所有正则表达式的有效性
    const validPatterns = patterns.filter(pattern => {
      try {
        new RegExp(pattern);
        return true;
      } catch (e) {
        console.error('无效的正则表达式:', pattern, e);
        return false;
      }
    });

    if (validPatterns.length !== patterns.length) {
      statusElement.textContent = '存在无效的正则表达式，已自动过滤';
      statusElement.style.color = '#ff6b6b';
    } else {
      statusElement.textContent = '设置已保存';
      statusElement.style.color = '#27ae60';
    }
      
    chrome.storage.sync.set({ blacklist: validPatterns }, () => {
      console.log('黑名单已保存:', validPatterns);
      statusElement.style.opacity = '1';
      
      setTimeout(() => {
        statusElement.style.opacity = '0';
      }, 2000);
    });
  });
});
