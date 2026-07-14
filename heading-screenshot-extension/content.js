// Content script that runs in the context of web pages

async function showHeadingAndCaptureScreenshot() {
  // Find all headings on the page
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  if (headings.length === 0) {
    alert('No headings found on this page!');
    return;
  }
  
  // Create heading level indicators (small boxes above each heading)
  const indicators = [];
  headings.forEach((heading, index) => {
    const level = heading.tagName.toLowerCase();
    const indicator = document.createElement('div');
    indicator.className = 'heading-level-indicator';
    indicator.textContent = level.toUpperCase();
    
    // Style for the small box above the heading
    indicator.style.cssText = `
      display: inline-block;
      background: #ff6b6b;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 2px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      border: 2px solid rgba(255,255,255,0.3);
    `;
    
    // Set color based on heading level
    const colors = {
      'h1': '#FF6B6B',
      'h2': '#4ECDC4',
      'h3': '#45B7D1',
      'h4': '#FFA07A',
      'h5': '#98D8C8',
      'h6': '#F7DC6F'
    };
    indicator.style.backgroundColor = colors[level] || '#FFFFFF';
    
    // Insert indicator before the heading
    heading.parentNode.insertBefore(indicator, heading);
    indicators.push(indicator);
  });
  
  // Wait a moment for the indicators to render
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Capture the full page screenshot - simplified approach using captureVisibleTab
  try {
    const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    
    // Remove indicators after screenshot is captured
    indicators.forEach(indicator => indicator.remove());
    
    if (response && response.dataUrl) {
      // Send the dataUrl to background script for download
      const downloadResponse = await chrome.runtime.sendMessage({ 
        action: 'downloadScreenshot', 
        dataUrl: response.dataUrl
      });
      
      if (downloadResponse && downloadResponse.success) {
        console.log('Screenshot saved successfully');
      } else if (downloadResponse && downloadResponse.error) {
        alert('Error downloading screenshot: ' + downloadResponse.error);
      }
    } else if (response && response.error) {
      alert('Error capturing screenshot: ' + response.error);
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    // Remove indicators on error
    indicators.forEach(indicator => indicator.remove());
    alert('Error capturing screenshot: ' + error.message);
  }
}

// Listen for extension icon click and execute the main function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showHeadings') {
    showHeadingAndCaptureScreenshot();
    sendResponse({ status: 'success' });
  }
});
