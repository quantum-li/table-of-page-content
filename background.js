chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateTOC",
    title: "Generate Table of Contents",
    contexts: ["page"]
  });
});

function sendMessageToActiveTab(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        }
      });
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateTOC") {
    sendMessageToActiveTab({ action: "generateTOC" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  sendMessageToActiveTab({ action: "generateTOC" });
});