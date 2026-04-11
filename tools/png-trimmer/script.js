/**
 * PNG Trimmer Logic
 */

const App = {
  filesData: [], // Array to hold { file, originalImage, croppedCanvas, originalW, originalH, croppedW, croppedH, name }

  init() {
    this.bindEvents();
    
    // Check if zip.js loaded
    if (typeof zip !== 'undefined') {
      zip.configure({ useWebWorkers: true });
    } else {
      console.warn("zip.js failed to load. Batch downloading will not work.");
    }
  },

  bindEvents() {
    const dropzone = document.getElementById('dropzone');
    const input = document.getElementById('file-input');

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', e => {
      this.handleFiles(e.target.files);
      input.value = ''; // reset
    });

    // Settings
    const tolSlider = document.getElementById('tolerance');
    const tolVal = document.getElementById('tol-val');
    tolSlider.addEventListener('input', e => {
      tolVal.textContent = e.target.value + '%';
    });
    tolSlider.addEventListener('change', () => this.reprocessAll());

    const pads = ['top', 'right', 'bottom', 'left'];
    pads.forEach(p => {
      document.getElementById('pad-' + p).addEventListener('change', () => this.reprocessAll());
    });

    document.getElementById('btn-download-all').addEventListener('click', () => this.downloadAllZIP());

    // URL Fetching
    const btnFetch = document.getElementById('btn-fetch-url');
    const inputUrl = document.getElementById('url-input');
    btnFetch.addEventListener('click', () => this.fetchImageFromUrl(inputUrl.value.trim()));
    inputUrl.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.fetchImageFromUrl(inputUrl.value.trim());
    });
  },

  async fetchImageFromUrl(url) {
    if (!url) return;
    const errorEl = document.getElementById('url-error');
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
    
    const btn = document.getElementById('btn-fetch-url');
    const originalText = btn.textContent;
    btn.textContent = '⏳';
    btn.disabled = true;

    try {
      let response;
      let usedProxy = false;
      
      try {
        // Attempt 1: Direct fetch
        response = await fetch(url);
        if (!response.ok) throw new Error("Direct fetch failed status: " + response.status);
      } catch (directErr) {
        // Attempt 2: CORS Proxy fallback
        usedProxy = true;
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Proxy fetch failed");
      }

      const blob = await response.blob();
      
      if (!blob.type.startsWith('image/')) {
        throw new Error('URL does not point to a valid image file.');
      }

      // Create a fake file from blob so it plugs into our existing pipeline seamlessly
      const ext = blob.type.split('/')[1] || 'png';
      const filename = `fetched_image_${Date.now()}.${ext}`;
      const file = new File([blob], filename, { type: blob.type });

      document.getElementById('url-input').value = ''; // clear input
      
      // Send to existing pipeline
      this.handleFiles([file]);

    } catch (err) {
      console.error("Fetch error:", err);
      errorEl.textContent = '❌ Failed to load image. The site may strictly block downloads.';
      errorEl.classList.remove('hidden');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  },

  async handleFiles(files) {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return alert('Only image files are supported.');

    document.getElementById('empty-state').classList.add('hidden');
    
    // Process each file
    for (const file of validFiles) {
      try {
        const img = await this.loadImage(file);
        const data = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          file: file,
          name: file.name,
          originalImage: img,
          originalW: img.width,
          originalH: img.height,
          croppedCanvas: null,
          croppedW: 0,
          croppedH: 0
        };
        this.filesData.push(data);
        this.processImageData(data); // Initial process
      } catch(err) {
        console.error("Failed to load image", err);
      }
    }

    this.renderList();
  },

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  getSettings() {
    return {
      tolerance: parseInt(document.getElementById('tolerance').value, 10),
      padding: {
        top: parseInt(document.getElementById('pad-top').value, 10) || 0,
        right: parseInt(document.getElementById('pad-right').value, 10) || 0,
        bottom: parseInt(document.getElementById('pad-bottom').value, 10) || 0,
        left: parseInt(document.getElementById('pad-left').value, 10) || 0
      }
    };
  },

  reprocessAll() {
    this.filesData.forEach(data => this.processImageData(data));
    this.renderList();
  },

  processImageData(data) {
    const s = this.getSettings();
    const origCanvas = document.createElement('canvas');
    origCanvas.width = data.originalW;
    origCanvas.height = data.originalH;
    const ctx = origCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(data.originalImage, 0, 0);

    const imgData = ctx.getImageData(0, 0, origCanvas.width, origCanvas.height);
    const bounds = this.getTrimBounds(imgData, origCanvas.width, origCanvas.height, s.tolerance);

    if (!bounds) {
      // Entire image is considered background/empty based on tolerance
      data.croppedCanvas = document.createElement('canvas'); // empty 0x0
      data.croppedW = 0;
      data.croppedH = 0;
      data.bounds = { top: 0, left: 0, right: 0, bottom: 0 };
      return;
    }

    // Calculate new size with padding
    let trimW = bounds.right - bounds.left;
    let trimH = bounds.bottom - bounds.top;

    let finalW = trimW + s.padding.left + s.padding.right;
    let finalH = trimH + s.padding.top + s.padding.bottom;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = finalW;
    cropCanvas.height = finalH;
    const cropCtx = cropCanvas.getContext('2d');
    
    // Draw the cropped portion onto the new padded canvas
    cropCtx.drawImage(
      origCanvas,
      bounds.left, bounds.top, trimW, trimH,    // Source (x,y,w,h)
      s.padding.left, s.padding.top, trimW, trimH // Dest (x,y,w,h)
    );

    data.croppedCanvas = cropCanvas;
    data.croppedW = finalW;
    data.croppedH = finalH;
    data.bounds = bounds;
  },

  getTrimBounds(imgData, width, height, tolerancePct) {
    const data = imgData.data;
    
    // Top-left pixel is our reference background color
    const bgR = data[0], bgG = data[1], bgB = data[2], bgA = data[3];
    
    // 1. Alpha Threshold: 
    // Always ignore practically invisible pixels (alpha < 5).
    // As tolerance increases, we aggressively trim higher-opacity pixels (fade/shadows).
    // 0% tolerance = alpha < 5. 100% tolerance = alpha < 255.
    const alphaThreshold = 5 + (tolerancePct / 100) * 250; 
    
    // 2. Color Euclidean Distance (for solid backgrounds like White)
    const tolSq = Math.pow((tolerancePct / 100) * 255, 2) * 3; // RGB max is 255^2 * 3

    function isBackground(r, g, b, a) {
       // If pixel is transparent enough, it's ALWAYS background
       if (a < alphaThreshold) return true;

       // If the image's overall background (top-left) is already transparent,
       // we ONLY trim based on transparency. We stop checking colors.
       if (bgA < 10) {
           return false; // Since a >= alphaThreshold here, it must be the object (foreground).
       }

       // If the image has a solid background (e.g. JPG with white background),
       // we compare the RGB difference against the top-left pixel.
       const diff = Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2);
       return diff <= tolSq;
    }

    let top = 0, bottom = height, left = 0, right = width;

    // Find Top
    topScan: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (!isBackground(data[i], data[i+1], data[i+2], data[i+3])) {
          top = y;
          break topScan;
        }
      }
    }

    // Find Bottom
    bottomScan: for (let y = height - 1; y >= top; y--) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (!isBackground(data[i], data[i+1], data[i+2], data[i+3])) {
          bottom = y + 1;
          break bottomScan;
        }
      }
    }

    // Find Left
    leftScan: for (let x = 0; x < width; x++) {
      for (let y = top; y < bottom; y++) {
        const i = (y * width + x) * 4;
        if (!isBackground(data[i], data[i+1], data[i+2], data[i+3])) {
          left = x;
          break leftScan;
        }
      }
    }

    // Find Right
    rightScan: for (let x = width - 1; x >= left; x--) {
      for (let y = top; y < bottom; y++) {
        const i = (y * width + x) * 4;
        if (!isBackground(data[i], data[i+1], data[i+2], data[i+3])) {
          right = x + 1;
          break rightScan;
        }
      }
    }

    if (top === 0 && bottom === height && left === 0 && right === width) {
       // If no change, return original bounds
       // Wait, if it scanned everything and found NO non-bg pixels, bottom will be original height.
       // Check if image is completely blank:
       if (top === 0 && bottom === height) {
           // Double check first row
           let isBlank = true;
           for(let x=0; x<width; x++) {
              let i = x*4;
              if(!isBackground(data[i], data[i+1], data[i+2], data[i+3])) { isBlank = false; break; }
           }
           if (isBlank && height > 0) return null; // Fully blank
       }
       return { top, bottom, left, right };
    }

    if (top >= height || left >= width) return null; // Blank image

    return { top, bottom, left, right };
  },

  renderList() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    if (this.filesData.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      document.getElementById('btn-download-all').classList.add('hidden');
      list.classList.add('hidden');
      return;
    }

    list.classList.remove('hidden');

    if (this.filesData.length > 1) {
      document.getElementById('btn-download-all').classList.remove('hidden');
    } else {
      document.getElementById('btn-download-all').classList.add('hidden');
    }

    this.filesData.forEach(data => {
      const card = document.createElement('div');
      card.className = 'image-card glass-panel';
      
      const isBlank = data.croppedW === 0;

      card.innerHTML = `
        <div class="image-card-header">
          <span class="img-name" title="${data.name}">${data.name}</span>
          <button class="btn-icon text-danger" onclick="App.removeFile('${data.id}')">✕</button>
        </div>
        <div class="image-preview-wrap">
           <div class="preview-box">
             <div class="preview-label">Original</div>
             <div class="preview-canvas-container" id="orig-cont-${data.id}">
               <!-- Original Canvas will be injected here -->
             </div>
           </div>
           <div class="preview-box">
             <div class="preview-label">Trimmed Result</div>
             <div class="preview-canvas-container" id="crop-cont-${data.id}">
               <!-- Cropped Canvas will be injected here -->
             </div>
           </div>
        </div>
        <div class="image-card-footer">
          <span class="img-stats">${data.originalW}x${data.originalH} &nbsp;→&nbsp; ${isBlank ? 'Blank' : `${data.croppedW}x${data.croppedH}`}</span>
          <button class="btn btn-accent btn-sm" onclick="App.downloadSingle('${data.id}')" ${isBlank ? 'disabled' : ''}>⬇️ Download</button>
        </div>
      `;
      list.appendChild(card);

      // Inject Original Canvas (scaled for view)
      if (data.originalImage) {
        const origCont = document.getElementById(`orig-cont-${data.id}`);
        
        // We draw the original image on a visible canvas to show what it looks like
        const cOrig = document.createElement('canvas');
        cOrig.width = data.originalW;
        cOrig.height = data.originalH;
        cOrig.getContext('2d').drawImage(data.originalImage, 0,0);
        cOrig.style.maxWidth = '100%'; 
        cOrig.style.maxHeight = '200px';
        cOrig.style.objectFit = 'contain';
        origCont.appendChild(cOrig);

        // Overlay bounding box to show what gets trimmed
        if (!isBlank && data.bounds) {
           const ctx = cOrig.getContext('2d');
           
           // Scale line width so it's always visible regardless of image resolution
           const lw = Math.max(2, data.originalW / 200);
           ctx.lineWidth = lw;
           ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
           ctx.setLineDash([lw * 2, lw * 2]);
           
           const bx = data.bounds.left;
           const by = data.bounds.top;
           const bw = data.bounds.right - data.bounds.left;
           const bh = data.bounds.bottom - data.bounds.top;

           // Tint the removed background area with a red wash
           ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
           ctx.fillRect(0, 0, data.originalW, by); // Top
           ctx.fillRect(0, by + bh, data.originalW, data.originalH - (by + bh)); // Bottom
           ctx.fillRect(0, by, bx, bh); // Left
           ctx.fillRect(bx + bw, by, data.originalW - (bx + bw), bh); // Right

           // Draw the dashed border bounding box
           ctx.strokeRect(bx, by, bw, bh);
        }
      }

      // Inject Cropped Canvas
      if (data.croppedCanvas) {
        const cropCont = document.getElementById(`crop-cont-${data.id}`);
        // Clone canvas for display
        const cCrop = document.createElement('canvas');
        cCrop.width = data.croppedCanvas.width;
        cCrop.height = data.croppedCanvas.height;
        if(cCrop.width > 0 && cCrop.height > 0) {
            cCrop.getContext('2d').drawImage(data.croppedCanvas, 0, 0);
        }
        cCrop.style.maxWidth = '100%';
        cCrop.style.maxHeight = '200px';
        cCrop.style.objectFit = 'contain';
        cropCont.appendChild(cCrop);
      }
    });
  },

  removeFile(id) {
    this.filesData = this.filesData.filter(d => d.id !== id);
    this.renderList();
  },

  downloadSingle(id) {
    const data = this.filesData.find(d => d.id === id);
    if (!data || !data.croppedCanvas || data.croppedW === 0) return;

    data.croppedCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trimmed_${data.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  },

  async downloadAllZIP() {
    if (this.filesData.length === 0 || typeof zip === 'undefined') return;

    const btn = document.getElementById('btn-download-all');
    btn.disabled = true;
    btn.textContent = '📦 Zipping...';

    try {
      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
      
      for (const data of this.filesData) {
        if (data.croppedCanvas && data.croppedW > 0) {
           const blob = await new Promise(res => data.croppedCanvas.toBlob(res, 'image/png'));
           await zipWriter.add(`trimmed_${data.name}`, new zip.BlobReader(blob));
        }
      }

      const zipBlob = await zipWriter.close();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trimmed_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
      alert('Failed to generate ZIP.');
    } finally {
      btn.disabled = false;
      btn.textContent = '📦 Download All ZIP';
    }
  }

};

document.addEventListener('DOMContentLoaded', () => App.init());
