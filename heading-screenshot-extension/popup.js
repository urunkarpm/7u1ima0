let capturedImage = null;

const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const scrollCheckbox = document.getElementById('scrollCheckbox');
const delayCheckbox = document.getElementById('delayCheckbox');
const status = document.getElementById('status');

captureBtn.addEventListener('click', captureScreenshot);
downloadBtn.addEventListener('click', downloadScreenshot);

async function captureScreenshot() {
  captureBtn.disabled = true;
  downloadBtn.disabled = true;
  showStatus('Loading...', 'loading');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (delayCheckbox.checked) {
      await new Promise(r => setTimeout(r, 1000));
    }
    
    if (scrollCheckbox.checked) {
      capturedImage = await captureFullPage(tab.id);
    } else {
      capturedImage = await captureVisibleTab(tab.id);
    }
    
    showStatus('✓ Screenshot captured successfully!', 'success');
    downloadBtn.disabled = false;
  } catch (error) {
    console.error('Capture error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    captureBtn.disabled = false;
  }
}

async function captureVisibleTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (imageUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(imageUrl);
      }
    });
  });
}

async function captureFullPage(tabId) {
  // Inject script to get page dimensions
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    function: getPageDimensions
  });
  
  const { pageHeight, pageWidth, currentScroll } = result.result;
  
  // Capture visible height - convert to canvas first to get dimensions
  const visibleHeightUrl = await captureVisibleTab(tabId);
  const visibleCanvas = await imageToCanvas(visibleHeightUrl);
  const captureHeight = visibleCanvas.height;
  
  // Create final canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = pageWidth;
  finalCanvas.height = pageHeight;
  const ctx = finalCanvas.getContext('2d');
  
  // Scroll and capture
  let scrollPosition = 0;
  const screenshots = [];
  
  while (scrollPosition < pageHeight) {
    // Scroll to position
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (pos) => window.scrollTo(0, pos),
      args: [scrollPosition]
    });
    
    // Small delay for rendering
    await new Promise(r => setTimeout(r, 100));
    
    // Capture
    const screenshot = await captureVisibleTab(tabId);
    const canvas = await imageToCanvas(screenshot);
    screenshots.push(canvas);
    
    scrollPosition += captureHeight;
  }
  
  // Stitch screenshots
  screenshots.forEach((canvas, index) => {
    ctx.drawImage(canvas, 0, index * captureHeight, pageWidth, captureHeight);
  });
  
  // Restore scroll position
  await chrome.scripting.executeScript({
    target: { tabId },
    function: (pos) => window.scrollTo(0, pos),
    args: [currentScroll]
  });
  
  return finalCanvas.toDataURL('image/png');
}

function imageToCanvas(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function getPageDimensions() {
  return {
    pageHeight: Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    ),
    pageWidth: document.documentElement.scrollWidth || document.body.scrollWidth,
    currentScroll: window.scrollY
  };
}

async function downloadScreenshot() {
  if (!capturedImage) return;
  
  const link = document.createElement('a');
  link.href = capturedImage;
  link.download = `screenshot-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showStatus('✓ Downloaded!', 'success');
}

function showStatus(message, type) {
  status.textContent = message;
  status.className = type;
  if (type !== 'loading') {
    setTimeout(() => {
      status.className = '';
    }, 3000);
  }
}
