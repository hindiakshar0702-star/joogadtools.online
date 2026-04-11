// ============================================================
// Real-ESRGAN AI Upscaler + Image Resizer
// 100% Client-Side — ONNX Runtime Web
// ============================================================

const MODEL_URL = 'https://huggingface.co/imgdesignart/realesrgan-x4-onnx/resolve/main/onnx/model.onnx';

// -------- AI Upscaler Engine --------
const AIEngine = {
  session: null,
  loading: false,
  loaded: false,
  modelScale: 4, // Real-ESRGAN x4 model always outputs 4x

  async loadModel(progressCallback) {
    if (this.loaded && this.session) return;
    if (this.loading) return;
    this.loading = true;

    try {
      progressCallback?.('Downloading AI model (~65 MB)...', 5);

      // Fetch model as ArrayBuffer with progress
      const response = await fetch(MODEL_URL);
      if (!response.ok) throw new Error('Model download failed: ' + response.status);
      
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength) : 67000000; // ~67MB estimate
      
      const reader = response.body.getReader();
      const chunks = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        const pct = Math.min(Math.round((receivedBytes / totalBytes) * 60), 60); // 0-60% for download
        progressCallback?.(`Downloading model... ${(receivedBytes / 1048576).toFixed(1)} MB`, pct);
      }

      // Combine chunks into single ArrayBuffer
      const modelBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        modelBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      progressCallback?.('Initializing AI engine...', 70);

      // Create ONNX session with best available backend
      const sessionOptions = {
        executionProviders: ['webgpu', 'webgl', 'wasm'],
        graphOptimizationLevel: 'all'
      };

      this.session = await ort.InferenceSession.create(modelBuffer.buffer, sessionOptions);
      this.loaded = true;
      progressCallback?.('AI Model Ready!', 100);

    } catch (err) {
      console.error('AI Model load error:', err);
      this.loading = false;
      throw err;
    } finally {
      this.loading = false;
    }
  },

  /**
   * Upscale an HTMLImageElement using Real-ESRGAN
   * @param {HTMLImageElement} imgElement - source image
   * @param {number} targetScale - 2 or 4
   * @param {number} tileSize - ignored (auto-detected from model)
   * @param {Function} progressCallback - (statusText, percent)
   * @returns {HTMLCanvasElement} - upscaled canvas
   */
  async upscale(imgElement, targetScale, tileSize, progressCallback) {
    if (!this.session) throw new Error('Model not loaded');

    // This model has fixed 64×64 input shape
    const modelTile = 64;

    const srcW = imgElement.naturalWidth || imgElement.width;
    const srcH = imgElement.naturalHeight || imgElement.height;

    // Draw source image to canvas to get pixel data
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(imgElement, 0, 0);

    const scale = this.modelScale; // Always 4x from model
    const outW = srcW * scale;
    const outH = srcH * scale;

    // Output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');

    // Calculate how many tiles we need
    const step = modelTile; // non-overlapping step = model tile size
    const tilesX = Math.ceil(srcW / step);
    const tilesY = Math.ceil(srcH / step);
    const totalTiles = tilesX * tilesY;
    let processedTiles = 0;

    progressCallback?.(`Processing ${totalTiles} tiles (${modelTile}×${modelTile})...`, 0);

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x1 = tx * step;
        const y1 = ty * step;
        const x2 = Math.min(x1 + step, srcW);
        const y2 = Math.min(y1 + step, srcH);
        const tileW = x2 - x1;
        const tileH = y2 - y1;

        // Extract tile pixels
        const tileData = srcCtx.getImageData(x1, y1, tileW, tileH);

        // Pad tile to exact model size (modelTile × modelTile)
        const paddedCanvas = document.createElement('canvas');
        paddedCanvas.width = modelTile;
        paddedCanvas.height = modelTile;
        const paddedCtx = paddedCanvas.getContext('2d');
        // Fill with black (or edge pixels) for padding
        paddedCtx.fillStyle = '#000';
        paddedCtx.fillRect(0, 0, modelTile, modelTile);
        paddedCtx.putImageData(tileData, 0, 0);

        const paddedData = paddedCtx.getImageData(0, 0, modelTile, modelTile);

        // Convert to Float32 tensor [1, 3, modelTile, modelTile]
        const inputTensor = this.imageDataToTensor(paddedData, modelTile, modelTile);

        // Run inference
        const feeds = {};
        feeds[this.session.inputNames[0]] = inputTensor;
        const results = await this.session.run(feeds);
        const outputTensor = results[this.session.outputNames[0]];

        // Output is [1, 3, modelTile*scale, modelTile*scale]
        const outTileFull = modelTile * scale;
        const outputImageData = this.tensorToImageData(outputTensor.data, outTileFull, outTileFull);

        // Draw output to temp canvas, then crop only the valid (non-padded) region
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = outTileFull;
        tmpCanvas.height = outTileFull;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.putImageData(outputImageData, 0, 0);

        // Crop: only take tileW*scale × tileH*scale from top-left
        const cropW = tileW * scale;
        const cropH = tileH * scale;

        outCtx.drawImage(
          tmpCanvas,
          0, 0, cropW, cropH,        // source: top-left of output (valid region)
          x1 * scale, y1 * scale, cropW, cropH  // destination on output canvas
        );

        processedTiles++;
        const pct = Math.round((processedTiles / totalTiles) * 100);
        progressCallback?.(`Tile ${processedTiles}/${totalTiles}`, pct);

        // Yield to event loop to keep UI responsive
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // If user wants 2x instead of 4x, downscale the 4x result
    if (targetScale === 2) {
      const halfCanvas = document.createElement('canvas');
      halfCanvas.width = srcW * 2;
      halfCanvas.height = srcH * 2;
      const halfCtx = halfCanvas.getContext('2d');
      halfCtx.drawImage(outCanvas, 0, 0, halfCanvas.width, halfCanvas.height);
      return halfCanvas;
    }

    return outCanvas;
  },

  getInputDims() {
    // Try to read input dimensions from the ONNX session
    try {
      const meta = this.session.handler?.inputMetadata;
      if (meta) {
        const firstInput = Object.values(meta)[0];
        if (firstInput?.dims) return firstInput.dims;
      }
    } catch (e) { /* ignore */ }
    // Default: assume 64x64 fixed input
    return [1, 3, 64, 64];
  },

  imageDataToTensor(imageData, width, height) {
    const { data } = imageData;
    const float32 = new Float32Array(3 * height * width);
    const channelSize = height * width;

    for (let i = 0; i < channelSize; i++) {
      const rgba = i * 4;
      float32[i] = data[rgba] / 255.0;                    // R
      float32[channelSize + i] = data[rgba + 1] / 255.0;  // G
      float32[2 * channelSize + i] = data[rgba + 2] / 255.0; // B
    }

    return new ort.Tensor('float32', float32, [1, 3, height, width]);
  },

  tensorToImageData(tensorData, width, height) {
    const imageData = new ImageData(width, height);
    const channelSize = height * width;

    for (let i = 0; i < channelSize; i++) {
      const rgba = i * 4;
      imageData.data[rgba] = Math.max(0, Math.min(255, Math.round(tensorData[i] * 255)));                    // R
      imageData.data[rgba + 1] = Math.max(0, Math.min(255, Math.round(tensorData[channelSize + i] * 255)));  // G
      imageData.data[rgba + 2] = Math.max(0, Math.min(255, Math.round(tensorData[2 * channelSize + i] * 255))); // B
      imageData.data[rgba + 3] = 255; // A
    }

    return imageData;
  }
};


// -------- Main App --------
const App = {
  elements: {},
  images: [],
  settings: {
    preset: 'custom',
    width: 0,
    height: 0,
    aspectLock: true,
    fitMode: 'contain',
    format: 'original',
    quality: 0.9,
    aiEnhance: false,
    aiScale: 4,
    tileSize: 128,
  },

  init() {
    this.bindElements();
    this.bindEvents();
  },

  bindElements() {
    const elId = id => document.getElementById(id);
    this.elements = {
      dropzone: elId('dropzone'),
      fileInput: elId('file-input'),
      urlInput: elId('url-input'),
      btnFetchUrl: elId('btn-fetch-url'),
      urlError: elId('url-error'),

      presetSelect: elId('preset-select'),
      dimWidth: elId('dim-width'),
      dimHeight: elId('dim-height'),
      aspectLock: elId('aspect-lock'),
      fitGroup: elId('fit-group'),
      fitModes: document.querySelectorAll('input[name="fit-mode"]'),

      formatTabs: document.querySelectorAll('.format-tab'),
      qualityGroup: elId('quality-group'),
      qualityRange: elId('quality'),
      qualityVal: elId('quality-val'),

      // AI elements
      aiToggle: elId('ai-enhance-toggle'),
      aiSettings: elId('ai-settings'),
      scaleTabs: document.querySelectorAll('.scale-tab'),
      tileRange: elId('tile-size'),
      tileVal: elId('tile-val'),
      aiProgressBar: elId('ai-progress-bar'),
      aiStatusText: elId('ai-status-text'),
      aiPercent: elId('ai-percent'),
      aiProgressFill: elId('ai-progress-fill'),

      btnProcessAll: elId('btn-process-all'),
      btnDownloadAll: elId('btn-download-all'),
      emptyState: elId('empty-state'),
      fileList: elId('file-list')
    };
  },

  bindEvents() {
    // 1. Upload
    this.elements.dropzone.addEventListener('click', () => this.elements.fileInput.click());
    this.elements.dropzone.addEventListener('dragover', e => { e.preventDefault(); this.elements.dropzone.classList.add('dragover'); });
    this.elements.dropzone.addEventListener('dragleave', () => this.elements.dropzone.classList.remove('dragover'));
    this.elements.dropzone.addEventListener('drop', e => {
      e.preventDefault();
      this.elements.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files) this.handleFiles(Array.from(e.dataTransfer.files));
    });
    this.elements.fileInput.addEventListener('change', e => {
      if (e.target.files) this.handleFiles(Array.from(e.target.files));
    });

    // 2. URL Fetch
    this.elements.btnFetchUrl.addEventListener('click', () => this.fetchImageFromUrl(this.elements.urlInput.value));

    // 3. Settings
    this.elements.presetSelect.addEventListener('change', (e) => this.handlePresetChange(e.target.value));
    this.elements.dimWidth.addEventListener('input', (e) => {
      this.settings.preset = 'custom';
      this.elements.presetSelect.value = 'custom';
      this.settings.width = parseInt(e.target.value) || 0;
      this.handleDimChange('width');
    });
    this.elements.dimHeight.addEventListener('input', (e) => {
      this.settings.preset = 'custom';
      this.elements.presetSelect.value = 'custom';
      this.settings.height = parseInt(e.target.value) || 0;
      this.handleDimChange('height');
    });
    this.elements.aspectLock.addEventListener('change', (e) => {
      this.settings.aspectLock = e.target.checked;
      this.checkFitModeVisibility();
    });
    this.elements.fitModes.forEach(r => r.addEventListener('change', e => { this.settings.fitMode = e.target.value; }));

    this.elements.formatTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active', 'btn-primary'));
        e.target.classList.add('active', 'btn-primary');
        this.settings.format = e.target.dataset.fmt;
        this.checkQualityVisibility();
      });
    });
    this.elements.qualityRange.addEventListener('input', (e) => {
      this.settings.quality = parseInt(e.target.value) / 100;
      this.elements.qualityVal.textContent = `${e.target.value}%`;
    });

    // 4. AI Settings
    this.elements.aiToggle.addEventListener('change', (e) => {
      this.settings.aiEnhance = e.target.checked;
      if (e.target.checked) {
        this.elements.aiSettings.classList.remove('hidden');
        this.elements.btnProcessAll.innerHTML = '✨ AI Enhance & Resize';
      } else {
        this.elements.aiSettings.classList.add('hidden');
        this.elements.btnProcessAll.innerHTML = '🔄 Resize All';
      }
    });

    this.elements.scaleTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.scale-tab').forEach(t => { t.classList.remove('active'); t.style.background = 'transparent'; });
        e.target.classList.add('active');
        e.target.style.background = 'var(--primary-color)';
        this.settings.aiScale = parseInt(e.target.dataset.scale);
      });
    });

    this.elements.tileRange.addEventListener('input', (e) => {
      this.settings.tileSize = parseInt(e.target.value);
      this.elements.tileVal.textContent = `${e.target.value}px`;
    });

    // 5. Actions
    this.elements.btnProcessAll.addEventListener('click', () => this.processAll());
    this.elements.btnDownloadAll.addEventListener('click', () => this.downloadAllZip());
  },

  // -------- UI Helpers --------
  checkFitModeVisibility() {
    if (this.settings.width > 0 && this.settings.height > 0 && !this.settings.aspectLock) {
      this.elements.fitGroup.style.display = 'block';
    } else {
      this.elements.fitGroup.style.display = 'none';
      this.settings.fitMode = 'contain';
      document.querySelector('input[name="fit-mode"][value="contain"]').checked = true;
    }
  },

  checkQualityVisibility() {
    if (this.settings.format === 'image/jpeg' || this.settings.format === 'image/webp') {
      this.elements.qualityGroup.style.display = 'block';
    } else {
      this.elements.qualityGroup.style.display = 'none';
    }
  },

  handlePresetChange(val) {
    if (val === 'custom') return;
    if (val === 'perc-50' || val === 'perc-25') {
      this.settings.width = 0;
      this.settings.height = 0;
      this.elements.dimWidth.value = '';
      this.elements.dimHeight.value = '';
      this.elements.aspectLock.checked = true;
      this.settings.aspectLock = true;
    } else {
      const [w, h] = val.split('x').map(Number);
      this.settings.width = w;
      this.settings.height = h;
      this.elements.dimWidth.value = w;
      this.elements.dimHeight.value = h;
      this.elements.aspectLock.checked = false;
      this.settings.aspectLock = false;
    }
    this.checkFitModeVisibility();
  },

  handleDimChange(changed) {
    if (this.settings.aspectLock && this.images.length > 0) {
      const ratio = this.images[0].originalWidth / this.images[0].originalHeight;
      if (changed === 'width' && this.settings.width > 0) {
        this.settings.height = Math.round(this.settings.width / ratio);
        this.elements.dimHeight.value = this.settings.height;
      } else if (changed === 'height' && this.settings.height > 0) {
        this.settings.width = Math.round(this.settings.height * ratio);
        this.elements.dimWidth.value = this.settings.width;
      }
    }
    this.checkFitModeVisibility();
  },

  updateAIProgress(text, percent) {
    this.elements.aiProgressBar.classList.remove('hidden');
    this.elements.aiStatusText.textContent = text;
    this.elements.aiPercent.textContent = `${percent}%`;
    this.elements.aiProgressFill.style.width = `${percent}%`;
  },

  hideAIProgress() {
    this.elements.aiProgressBar.classList.add('hidden');
  },

  // -------- Upload & Fetch --------
  handleFiles(files) {
    const valid = files.filter(f => f.type.startsWith('image/'));
    valid.forEach(f => this.addImage(f));
  },

  async fetchImageFromUrl(url) {
    url = url.trim();
    if (!url) return;
    this.elements.btnFetchUrl.textContent = "Loading...";
    this.elements.btnFetchUrl.disabled = true;
    this.elements.urlError.classList.add('hidden');

    try {
      const isDataUrl = url.startsWith('data:image/');
      let blob;
      let filename = "fetched_image.png";

      if (isDataUrl) {
        const res = await fetch(url);
        blob = await res.blob();
        filename = "base64_image.png";
      } else {
        filename = url.split('/').pop().split('?')[0] || "image.png";
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) throw new Error("CORS failed");
          blob = await res.blob();
        } catch (e) {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error("Proxy fetch failed");
          blob = await res.blob();
        }
      }

      if (!blob.type.startsWith('image/')) throw new Error("Not a valid image");
      const file = new File([blob], filename, { type: blob.type });
      this.addImage(file);
      this.elements.urlInput.value = '';
    } catch (e) {
      this.elements.urlError.textContent = "Failed to load image. Ensure URL is direct and public.";
      this.elements.urlError.classList.remove('hidden');
    } finally {
      this.elements.btnFetchUrl.textContent = "Fetch";
      this.elements.btnFetchUrl.disabled = false;
    }
  },

  addImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const id = 'img_' + Math.random().toString(36).substr(2, 9);
        const item = {
          id,
          file,
          name: file.name,
          originalImage: img,
          originalWidth: img.width,
          originalHeight: img.height,
          originalSize: file.size,
          resultBlob: null,
          resultDataUrl: null,
          newWidth: img.width,
          newHeight: img.height
        };
        this.images.push(item);
        this.renderList();

        if (this.images.length === 1 && this.settings.preset === 'custom' && this.settings.width === 0) {
          this.settings.width = img.width;
          this.settings.height = img.height;
          this.elements.dimWidth.value = img.width;
          this.elements.dimHeight.value = img.height;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  removeImage(id) {
    this.images = this.images.filter(i => i.id !== id);
    this.renderList();
  },

  // -------- Rendering --------
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  renderList() {
    const list = this.elements.fileList;
    if (this.images.length === 0) {
      list.classList.add('hidden');
      this.elements.emptyState.classList.remove('hidden');
      this.elements.btnDownloadAll.classList.add('hidden');
      return;
    }

    list.classList.remove('hidden');
    this.elements.emptyState.classList.add('hidden');

    const allProcessed = this.images.every(img => img.resultBlob);
    if (allProcessed && this.images.length > 0) {
      this.elements.btnDownloadAll.classList.remove('hidden');
    } else {
      this.elements.btnDownloadAll.classList.add('hidden');
    }

    list.innerHTML = '';
    this.images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'image-card glass-panel';

      const beforeSize = this.formatBytes(img.originalSize);
      let afterStr = img.resultBlob ? `<span style="color:var(--success)">${this.formatBytes(img.resultBlob.size)}</span>` : `<span class="text-muted">Pending...</span>`;
      let dimStr = img.resultBlob ? `${img.originalWidth}×${img.originalHeight} → ${img.newWidth}×${img.newHeight}` : `${img.originalWidth}×${img.originalHeight}`;

      let src = img.resultDataUrl || img.originalImage.src;
      let aiTag = img.aiEnhanced ? '<span style="font-size:0.65rem; background:linear-gradient(135deg,#6c63ff,#f64f59); padding:1px 6px; border-radius:8px; margin-left:4px;">AI✨</span>' : '';

      card.innerHTML = `
        <div class="image-card-header">
          <span class="img-name" title="${img.name}">${img.name}${aiTag}</span>
          <button class="btn-icon text-danger" onclick="App.removeImage('${img.id}')">✕</button>
        </div>
        <div class="image-preview-wrap">
          <img src="${src}" style="max-width:100%; max-height:150px; object-fit:contain; border-radius:4px;">
        </div>
        <div class="image-card-footer" style="flex-direction:column; align-items:flex-start; gap:8px;">
          <div style="font-size:0.75rem;">
            <div>Dims: ${dimStr}</div>
            <div>Size: <span class="text-danger">${beforeSize}</span> → ${afterStr}</div>
          </div>
          ${img.resultBlob ? `<button class="btn btn-accent btn-sm w-full" onclick="App.downloadSingle('${img.id}')">⬇️ Download</button>` : ''}
        </div>
      `;
      list.appendChild(card);
    });
  },

  // -------- Processing Pipeline --------
  async processAll() {
    if (this.images.length === 0) return;
    
    const btn = this.elements.btnProcessAll;
    btn.textContent = "Processing...";
    btn.disabled = true;

    try {
      // Step 1: Load AI model if AI enhance is ON
      if (this.settings.aiEnhance && !AIEngine.loaded) {
        this.updateAIProgress('Downloading AI model...', 0);
        await AIEngine.loadModel((text, pct) => this.updateAIProgress(text, pct));
      }

      // Step 2: Process each image
      for (let i = 0; i < this.images.length; i++) {
        let sourceImage = this.images[i].originalImage;

        // Step 2a: AI upscale if enabled
        if (this.settings.aiEnhance) {
          this.updateAIProgress(`Image ${i + 1}/${this.images.length}: Starting AI...`, 0);
          
          const upscaledCanvas = await AIEngine.upscale(
            sourceImage,
            this.settings.aiScale,
            this.settings.tileSize,
            (text, pct) => this.updateAIProgress(`Image ${i + 1}: ${text}`, pct)
          );

          // Create a temporary image from the upscaled canvas for the resize step
          const tempImg = new Image();
          await new Promise((resolve) => {
            tempImg.onload = resolve;
            tempImg.src = upscaledCanvas.toDataURL('image/png');
          });

          // Replace source for resize step with AI-upscaled version
          sourceImage = tempImg;
          this.images[i].aiEnhanced = true;
        }

        // Step 2b: Standard resize + format + quality
        await this.processImage(this.images[i], sourceImage);
      }

      this.hideAIProgress();
      this.renderList();

    } catch (err) {
      console.error('Processing error:', err);
      this.hideAIProgress();
      alert('Error: ' + err.message);
    } finally {
      btn.textContent = this.settings.aiEnhance ? '✨ AI Enhance & Resize' : '🔄 Resize All';
      btn.disabled = false;
    }
  },

  processImage(imgObj, sourceImage) {
    return new Promise((resolve) => {
      const srcW = sourceImage.naturalWidth || sourceImage.width;
      const srcH = sourceImage.naturalHeight || sourceImage.height;

      let targetW = this.settings.width;
      let targetH = this.settings.height;

      // Handle Percentage Logic
      if (this.settings.preset === 'perc-50') {
        targetW = Math.round(srcW * 0.5);
        targetH = Math.round(srcH * 0.5);
      } else if (this.settings.preset === 'perc-25') {
        targetW = Math.round(srcW * 0.25);
        targetH = Math.round(srcH * 0.25);
      } else if (targetW === 0 || targetH === 0) {
        targetW = srcW;
        targetH = srcH;
      }

      // Handle Aspect Lock
      if (this.settings.aspectLock && this.settings.preset === 'custom') {
        const ratio = srcW / srcH;
        if (this.settings.width > 0 && this.settings.height === 0) {
          targetW = this.settings.width;
          targetH = Math.round(targetW / ratio);
        } else if (this.settings.height > 0 && this.settings.width === 0) {
          targetH = this.settings.height;
          targetW = Math.round(targetH * ratio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (this.settings.aspectLock || this.settings.preset.startsWith('perc')) {
        ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
      } else {
        if (this.settings.fitMode === 'cover') {
          const scale = Math.max(targetW / srcW, targetH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          const x = (targetW - drawW) / 2;
          const y = (targetH - drawH) / 2;
          ctx.drawImage(sourceImage, x, y, drawW, drawH);
        } else {
          const scale = Math.min(targetW / srcW, targetH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          const x = (targetW - drawW) / 2;
          const y = (targetH - drawH) / 2;
          let outTypeStr = this.settings.format === 'original' ? imgObj.file.type : this.settings.format;
          if (outTypeStr === 'image/jpeg') {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
          }
          ctx.drawImage(sourceImage, x, y, drawW, drawH);
        }
      }

      let outType = this.settings.format;
      if (outType === 'original') outType = imgObj.file.type;
      let outQuality = this.settings.quality;

      let ext = outType.split('/')[1] || 'png';
      if (ext === 'jpeg') ext = 'jpg';

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        imgObj.resultBlob = blob;
        imgObj.resultDataUrl = url;
        imgObj.newWidth = targetW;
        imgObj.newHeight = targetH;

        const baseName = imgObj.name.substring(0, imgObj.name.lastIndexOf('.')) || imgObj.name;
        const suffix = imgObj.aiEnhanced ? '_enhanced' : '_resized';
        imgObj.name = `${baseName}${suffix}.${ext}`;

        resolve();
      }, outType, outQuality);
    });
  },

  downloadSingle(id) {
    const imgInfo = this.images.find(i => i.id === id);
    if (!imgInfo || !imgInfo.resultBlob) return;
    const a = document.createElement('a');
    a.href = imgInfo.resultDataUrl;
    a.download = imgInfo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  async downloadAllZip() {
    const btn = this.elements.btnDownloadAll;
    btn.textContent = "Creating ZIP...";
    btn.disabled = true;

    try {
      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
      for (const img of this.images) {
        if (img.resultBlob) {
          await zipWriter.add(img.name, new zip.BlobReader(img.resultBlob));
        }
      }
      const zipBlob = await zipWriter.close();
      const url = URL.createObjectURL(zipBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
      alert("Error creating ZIP.");
    } finally {
      btn.textContent = "📦 Download All ZIP";
      btn.disabled = false;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
