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
  
  // Capture the full page screenshot by scrolling and stitching
  try {
    const fullPageDataUrl = await captureFullPageScreenshot();
    
    // Remove indicators after screenshot is captured
    indicators.forEach(indicator => indicator.remove());
    
    if (fullPageDataUrl) {
      // Send the dataUrl to background script for download
      const downloadResponse = await chrome.runtime.sendMessage({ 
        action: 'downloadScreenshot', 
        dataUrl: fullPageDataUrl
      });
      
      if (downloadResponse && downloadResponse.success) {
        console.log('Screenshot saved successfully');
      } else if (downloadResponse && downloadResponse.error) {
        alert('Error downloading screenshot: ' + downloadResponse.error);
      }
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    // Remove indicators on error
    indicators.forEach(indicator => indicator.remove());
    alert('Error capturing screenshot: ' + error.message);
  }
}

async function captureFullPageScreenshot() {
  // Get the total scrollable height of the page
  const totalHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
  
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const segments = [];
  let currentScroll = 0;
  
  // Scroll through the page and capture each segment
  while (currentScroll < totalHeight) {
    // Scroll to the current position
    window.scrollTo(0, currentScroll);
    
    // Wait for the page to settle and any lazy-loaded content to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Capture the current viewport
    const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    
    if (response && response.error) {
      throw new Error(response.error);
    }
    
    if (!response || !response.dataUrl) {
      throw new Error('Failed to capture screenshot segment');
    }
    
    segments.push({
      scrollY: currentScroll,
      dataUrl: response.dataUrl
    });
    
    // Move to the next segment
    currentScroll += viewportHeight;
  }
  
  // Scroll back to top
  window.scrollTo(0, 0);
  
  // Create a canvas to stitch all segments together
  const canvas = document.createElement('canvas');
  canvas.width = viewportWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  
  // Load and draw each segment
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = segment.dataUrl;
    });
    
    // Calculate the source and destination coordinates
    const srcY = Math.min(segment.scrollY % viewportHeight, viewportHeight);
    const srcHeight = Math.min(viewportHeight - srcY, totalHeight - segment.scrollY);
    const destY = segment.scrollY;
    
    // Draw the relevant portion of the segment
    ctx.drawImage(
      img,
      0, srcY, viewportWidth, srcHeight,
      0, destY, viewportWidth, srcHeight
    );
  }
  
  // Convert canvas to data URL
  return canvas.toDataURL('image/png');
}

// Listen for extension icon click and execute the main function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showHeadings') {
    showHeadingAndCaptureScreenshot();
    sendResponse({ status: 'success' });
  }
});
