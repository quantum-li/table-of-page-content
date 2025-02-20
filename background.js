chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateTOC",
    title: "Generate Table of Contents",
    contexts: ["page"]
  });
});

function sendMessageToActiveTab(message, retries = 3) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      console.error('No active tab found');
      return;
    }

    function attemptSend(retriesLeft) {
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        if (chrome.runtime.lastError) {
          console.warn('Send message error:', chrome.runtime.lastError.message);
          if (retriesLeft > 0) {
            setTimeout(() => attemptSend(retriesLeft - 1), 100);
          }
        } else if (response) {
          console.log("Response received:", response);
        }
      });
    }

    attemptSend(retries);
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateTOC") {
    sendMessageToActiveTab({ action: "generateTOC" });
  }
});

function ensureContentScriptInjected(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content.js']
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error('Script injection error:', chrome.runtime.lastError.message);
      callback(false);
    } else {
      // 等待脚本初始化
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "checkReady" }, (response) => {
          callback(!chrome.runtime.lastError && response?.status === "ready");
        });
      }, 100);
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  ensureContentScriptInjected(tab.id, (success) => {
    if (success) {
      sendMessageToActiveTab({ action: "generateTOC" });
    } else {
      console.error('Failed to inject content script');
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    sendMessageToActiveTab({ action: "checkReady" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ready") {
    console.log("Content script is ready");
  }
});
