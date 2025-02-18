chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToBlacklist",
    title: "将当前域名添加到黑名单",
    contexts: ["all"]
  });
});

// 发送消息前检查标签页是否已经加载完成
function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      console.log('Message sending failed:', lastError.message);
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToBlacklist") {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const rootDomain = extractRootDomain(domain);
    
    chrome.storage.sync.get('blacklist', (data) => {
      const blacklist = data.blacklist || [];
      // 创建两个正则表达式：一个匹配域名本身，一个匹配所有子域名
      const newEntries = [
        `${escapeRegExp(rootDomain)}$`,
        `.*\\.${escapeRegExp(rootDomain)}$`
      ];
      const updatedBlacklist = [...new Set([...blacklist, ...newEntries])];
      chrome.storage.sync.set({ blacklist: updatedBlacklist }, () => {
          sendMessageToTab(tab.id, {action: "updateBlacklist"});
        console.log(`已将 ${rootDomain} 的正则表达式添加到黑名单`);
        });
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  sendMessageToTab(tab.id, {action: "reinitTOC"});
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.blacklist) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        sendMessageToTab(tabs[0].id, {action: "updateBlacklist"});
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBlacklist") {
    console.log('收到更新黑名单的消息');
    checkAndInitTOC();
  }
});

function extractRootDomain(domain) {
  const parts = domain.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

// 添加辅助函数用于转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}