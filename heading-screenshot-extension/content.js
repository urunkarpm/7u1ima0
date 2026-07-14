// Content script that runs in the context of web pages

async function showHeadingAndCaptureScreenshot() {
  // Find all headings on the page
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  // Find all images with alt text on the page
  const images = document.querySelectorAll('img[alt]');
  
  if (headings.length === 0 && images.length === 0) {
    alert('No headings or images with alt text found on this page!');
    return;
  }
  
  // Create an overlay to display heading and image information
  const overlay = document.createElement('div');
  overlay.id = 'heading-screenshot-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px;
    border-radius: 8px;
    z-index: 999999;
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  `;

  // Add headings section
  if (headings.length > 0) {
    const title = document.createElement('h3');
    title.textContent = 'Heading Levels Found:';
    title.style.marginTop = '0';
    title.style.borderBottom = '1px solid #555';
    title.style.paddingBottom = '10px';
    overlay.appendChild(title);

    const list = document.createElement('ul');
    list.style.paddingLeft = '20px';
    list.style.margin = '10px 0';

    headings.forEach((heading, index) => {
      const level = heading.tagName.toLowerCase();
      const text = heading.textContent.trim().substring(0, 50);
      const item = document.createElement('li');
      item.textContent = `${level.toUpperCase()}: ${text}${heading.textContent.trim().length > 50 ? '...' : ''}`;
      item.style.margin = '5px 0';
      item.style.color = getContrastColor(level);
      list.appendChild(item);
    });

    overlay.appendChild(list);

    const info = document.createElement('p');
    info.textContent = `Total: ${headings.length} heading(s)`;
    info.style.marginTop = '15px';
    info.style.fontStyle = 'italic';
    info.style.borderTop = '1px solid #555';
    info.style.paddingTop = '10px';
    overlay.appendChild(info);
  }

  // Add images section
  if (images.length > 0) {
    const imgTitle = document.createElement('h3');
    imgTitle.textContent = 'Images with Alt Text:';
    imgTitle.style.marginTop = '15px';
    imgTitle.style.borderBottom = '1px solid #555';
    imgTitle.style.paddingBottom = '10px';
    overlay.appendChild(imgTitle);

    const imgList = document.createElement('ul');
    imgList.style.paddingLeft = '20px';
    imgList.style.margin = '10px 0';

    images.forEach((img, index) => {
      const altText = img.alt.trim().substring(0, 50);
      const item = document.createElement('li');
      item.textContent = `IMG: ${altText || '(empty alt)'}${img.alt.trim().length > 50 ? '...' : ''}`;
      item.style.margin = '5px 0';
      item.style.color = '#98D8C8';
      imgList.appendChild(item);
    });

    overlay.appendChild(imgList);

    const imgInfo = document.createElement('p');
    imgInfo.textContent = `Total: ${images.length} image(s)`;
    imgInfo.style.marginTop = '15px';
    imgInfo.style.fontStyle = 'italic';
    imgInfo.style.borderTop = '1px solid #555';
    imgInfo.style.paddingTop = '10px';
    overlay.appendChild(imgInfo);
  }

  document.body.appendChild(overlay);

  // Wait a moment for the overlay to render
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Capture the full page screenshot
  try {
    const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    
    if (response && response.dataUrl) {
      // Create download link for the screenshot
      const downloadLink = document.createElement('a');
      downloadLink.href = response.dataUrl;
      downloadLink.download = `screenshot-${new Date().getTime()}.png`;
      downloadLink.click();
      
      // Update overlay with success message
      const successMsg = overlay.querySelector('p:last-child');
      if (successMsg) {
        successMsg.textContent += ' ✓ Screenshot captured!';
        successMsg.style.color = '#4CAF50';
      }
      
      // Remove overlay after 3 seconds
      setTimeout(() => {
        overlay.remove();
      }, 3000);
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    const errorMsg = overlay.querySelector('p:last-child');
    if (errorMsg) {
      errorMsg.textContent += ' ✗ Error capturing screenshot';
      errorMsg.style.color = '#f44336';
    }
  }
}

function getContrastColor(level) {
  const colors = {
    'h1': '#FF6B6B',
    'h2': '#4ECDC4',
    'h3': '#45B7D1',
    'h4': '#FFA07A',
    'h5': '#98D8C8',
    'h6': '#F7DC6F'
  };
  return colors[level] || '#FFFFFF';
}

// Listen for extension icon click and execute the main function
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showHeadings') {
    showHeadingAndCaptureScreenshot();
    sendResponse({ status: 'success' });
  }
});
