chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Send message to content script to show heading levels and capture screenshot
    await chrome.tabs.sendMessage(tab.id, { action: 'showHeadings' });
  } catch (error) {
    console.error('Error sending message:', error);
    // If content script is not loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'showHeadings' });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    captureFullPageScreenshot(sender.tab.id)
      .then(dataUrl => sendResponse({ dataUrl }))
      .catch(error => {
        console.error('Error capturing screenshot:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

async function captureFullPageScreenshot(tabId) {
  // Capture the visible tab screenshot
  const dataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: 'png'
  });

  return dataUrl;
}
