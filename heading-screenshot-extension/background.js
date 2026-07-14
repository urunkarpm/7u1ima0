chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Inject content script and show heading levels, then capture screenshot
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'showHeadings' });
  } catch (error) {
    console.error('Error:', error);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    // Get the window ID from the sender's tab and capture that window
    chrome.tabs.get(sender.tab.id, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      
      // captureVisibleTab needs windowId, not tabId
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
        .then(dataUrl => {
          sendResponse({ dataUrl: dataUrl });
        })
        .catch(error => {
          console.error('Error capturing screenshot:', error);
          sendResponse({ error: error.message });
        });
    });
    return true; // Keep the message channel open for async response
  } else if (message.action === 'downloadScreenshot') {
    // Download the screenshot using chrome.downloads API
    const url = URL.createObjectURL(message.blob);
    chrome.downloads.download({
      url: url,
      filename: `screenshot-${new Date().getTime()}.png`,
      saveAs: false
    }, () => {
      URL.revokeObjectURL(url);
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }
});
