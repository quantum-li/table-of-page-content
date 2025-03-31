// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateTOC",
    title: "生成页面目录",
    contexts: ["page"]
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateTOC") {
    chrome.tabs.sendMessage(tab.id, { action: "generateTOC" });
  }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "generateTOC" });
});
