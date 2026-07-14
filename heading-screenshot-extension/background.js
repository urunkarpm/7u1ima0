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
  // Use Chrome DevTools Protocol to capture full page screenshot
  try {
    // Attach debugger to the tab
    await chrome.debugger.attach({ tabId }, "1.3");
    
    // Enable Page domain
    await chrome.debugger.sendCommand({ tabId }, "Page.enable");
    
    // Get the page viewport and full page dimensions
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        };
      }
    });
    
    const pageInfo = results[0].result;
    
    // Set the viewport to capture the full page
    await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
      width: pageInfo.scrollWidth,
      height: pageInfo.scrollHeight,
      deviceScaleFactor: pageInfo.devicePixelRatio,
      mobile: false
    });
    
    // Capture the screenshot with explicit viewport
    const screenshotData = await chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot", {
      format: "png",
      fromSurface: true
    });
    
    // Reset the viewport back to normal
    await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
      width: pageInfo.innerWidth,
      height: pageInfo.innerHeight,
      deviceScaleFactor: pageInfo.devicePixelRatio,
      mobile: false
    });
    
    // Detach debugger
    await chrome.debugger.detach({ tabId });
    
    // Convert base64 data URL
    const dataUrl = `data:image/png;base64,${screenshotData.data}`;
    
    return dataUrl;
  } catch (error) {
    // Try to detach debugger if it's still attached
    try {
      await chrome.debugger.detach({ tabId });
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    console.error('Error capturing full page screenshot:', error);
    throw error;
  }
}
