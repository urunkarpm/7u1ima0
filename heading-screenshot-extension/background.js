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

// Listen for messages from content script (kept for compatibility but no longer used)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadScreenshot') {
    // Download the screenshot using chrome.downloads API
    chrome.downloads.download({
      url: message.dataUrl,
      filename: `screenshot-${new Date().getTime()}.png`,
      saveAs: false
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep the message channel open for async response
  }
});
