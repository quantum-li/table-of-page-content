document.getElementById('generateTOC').addEventListener('click', () => {
  const button = document.getElementById('generateTOC');
  button.disabled = true;
  button.textContent = 'Generating...';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      showError('No active tab found');
      return;
    }

      chrome.tabs.sendMessage(tabs[0].id, {action: "generateTOC"}, function(response) {
      button.disabled = false;
      button.textContent = 'Generate Table of Contents';

        if (chrome.runtime.lastError) {
        console.error("Connection error:", chrome.runtime.lastError.message);
        showError('Failed to generate TOC. Please refresh the page and try again.');
      } else if (response?.status === "success") {
        window.close(); // 成功时关闭弹窗
      } else {
        showError('Unknown error occurred');
        }
      });
  });
});

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.color = 'red';
  errorDiv.style.marginTop = '10px';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
}