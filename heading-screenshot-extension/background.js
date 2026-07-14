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
    captureFullPageScreenshot(sender.tab.id)
      .then(blob => {
        // Download the screenshot using chrome.downloads API
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: `screenshot-${new Date().getTime()}.png`,
          saveAs: false
        }, () => {
          URL.revokeObjectURL(url);
          sendResponse({ success: true });
        });
      })
      .catch(error => {
        console.error('Error capturing screenshot:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
});

function getPageDimensions() {
  return {
    width: Math.max(
      document.body.scrollWidth, document.documentElement.scrollWidth,
      document.body.offsetWidth, document.documentElement.offsetWidth,
      document.body.clientWidth, document.documentElement.clientWidth
    ),
    height: Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight,
      document.body.clientHeight, document.documentElement.clientHeight
    ),
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth
  };
}

async function drawImageToCanvas(ctx, dataUrl, x, y, width, height) {
  return new Promise((resolve, reject) => {
    // Use ImageBitmap if available (Chrome service workers support this)
    if (typeof createImageBitmap !== 'undefined') {
      // Fetch the image data and create an ImageBitmap (works in service workers)
      fetch(dataUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
          }
          return response.blob();
        })
        .then(blob => {
          if (!blob || blob.size === 0) {
            throw new Error('Received empty blob');
          }
          return createImageBitmap(blob);
        })
        .then(img => {
          ctx.drawImage(img, x, y, width, height);
          resolve();
        })
        .catch(error => {
          console.error('Error in createImageBitmap path:', error);
          reject(new Error('Failed to load image: ' + error.message));
        });
    } else {
      // Fallback for environments where createImageBitmap is not available
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, y, width, height);
        resolve();
      };
      img.onerror = (e) => {
        console.error('Image onload error:', e);
        reject(new Error('Failed to load image'));
      };
      img.src = dataUrl;
    }
  });
}

async function captureFullPageScreenshot(tabId) {
  // 1. Get dimensions by injecting content script
  const [{ result: dims }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: getPageDimensions
  });

  // Check canvas size limits (most browsers limit to 16384x16384)
  const MAX_CANVAS_SIZE = 16384;
  if (dims.width > MAX_CANVAS_SIZE || dims.height > MAX_CANVAS_SIZE) {
    throw new Error(`Page dimensions (${dims.width}x${dims.height}) exceed maximum canvas size (${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE})`);
  }

  // 2. Prepare canvas to stitch images together
  const canvas = new OffscreenCanvas(dims.width, dims.height);
  const ctx = canvas.getContext('2d');

  // Hide sticky/fixed elements before capturing
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const fixedElements = document.querySelectorAll('*');
      const originalStyles = [];
      fixedElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          originalStyles.push({ element: el, position: el.style.position });
          el.style.position = 'absolute';
        }
      });
      window._originalFixedStyles = originalStyles;
    }
  });

  let scrollY = 0;
  
  // 3. Loop and capture
  while (scrollY < dims.height) {
    // Scroll to position
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (y) => window.scrollTo(0, y),
      args: [scrollY]
    });

    // Wait for scroll events to fire and page to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture visible viewport
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

    // Draw the dataUrl to canvas at correct coordinates
    await drawImageToCanvas(ctx, dataUrl, 0, scrollY, dims.windowWidth, dims.windowHeight);

    scrollY += dims.windowHeight;
  }

  // Restore sticky/fixed elements
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (window._originalFixedStyles) {
        window._originalFixedStyles.forEach(item => {
          item.element.style.position = item.position;
        });
        delete window._originalFixedStyles;
      }
    }
  });

  // Reset scroll position
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.scrollTo(0, 0)
  });

  // 4. Export the stitched image as blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blob;
}
