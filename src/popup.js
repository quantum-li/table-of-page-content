document.getElementById('generateTOC').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "generateTOC"})
      .catch(error => {
        console.log("页面未加载完成或不支持目录生成");
      });
    window.close();
  });
});
