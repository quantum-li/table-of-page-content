chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToBlacklist",
    title: "将当前域名添加到黑名单",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToBlacklist") {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    chrome.storage.sync.get('blacklist', (data) => {
      const blacklist = data.blacklist || [];
      if (!blacklist.includes(domain)) {
        blacklist.push(domain);
        chrome.storage.sync.set({ blacklist }, () => {
          console.log(`已将 ${domain} 添加到黑名单`);
        });
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {action: "reinitTOC"});
});