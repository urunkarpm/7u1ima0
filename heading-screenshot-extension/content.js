// Content script that runs in the context of web pages

/**
 * Download image helper
 */
function downloadImage(imageData, filename) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Full Page Screenshot Capture Logic
 * Scrolls through entire page and stitches screenshots together
 */
async function captureFullPageScreenshot() {
  try {
    // Get page dimensions
    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    const pageWidth = document.documentElement.scrollWidth || document.body.scrollWidth;
    const currentScroll = window.scrollY;
    
    console.log(`Page dimensions: ${pageWidth}x${pageHeight}`);
    
    // Get visible viewport height
    const viewportHeight = window.innerHeight;
    
    // Create final canvas for stitching
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = pageWidth;
    finalCanvas.height = pageHeight;
    const ctx = finalCanvas.getContext('2d');
    
    // Capture screenshots
    let scrollPosition = 0;
    let captureIndex = 0;
    
    while (scrollPosition < pageHeight) {
      // Scroll to position
      window.scrollTo(0, scrollPosition);
      
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture visible area using html2canvas (or your preferred method)
      const screenshot = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scrollY: -scrollPosition,
        scrollX: 0,
        windowHeight: pageHeight
      });
      
      // Draw on final canvas
      ctx.drawImage(screenshot, 0, scrollPosition);
      
      console.log(`Captured section ${++captureIndex} at scroll ${scrollPosition}px`);
      
      scrollPosition += viewportHeight;
    }
    
    // Restore original scroll position
    window.scrollTo(0, currentScroll);
    
    // Convert to downloadable image
    const image = finalCanvas.toDataURL('image/png');
    downloadImage(image, `screenshot-${Date.now()}.png`);
    
    return image;
    
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    throw error;
  }
}

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
  
  // Capture the full page screenshot using html2canvas
  try {
    await captureFullPageScreenshot();
    
    // Remove indicators after screenshot is captured
    indicators.forEach(indicator => indicator.remove());
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
