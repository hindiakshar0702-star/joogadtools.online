const App = {
  elements: {},
  images: [], // { id, file, originalImage, originalWidth, originalHeight, resultBlob, resultDataUrl, name }
  settings: {
    preset: 'custom',
    width: 0,
    height: 0,
    aspectLock: true,
    fitMode: 'contain',
    format: 'original',
    quality: 0.9,
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

      btnProcessAll: elId('btn-process-all'),
      btnDownloadAll: elId('btn-download-all'),

      emptyState: elId('empty-state'),
      fileList: elId('file-list')
    };
  },

  bindEvents() {
    // 1. Upload logic
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

    // 2. URL Fetch logic
    this.elements.btnFetchUrl.addEventListener('click', () => this.fetchImageFromUrl(this.elements.urlInput.value));

    // 3. Settings logic
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

    this.elements.fitModes.forEach(r => r.addEventListener('change', e => {
      this.settings.fitMode = e.target.value;
    }));

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

    // 4. Action logic
    this.elements.btnProcessAll.addEventListener('click', () => this.processAll());
    this.elements.btnDownloadAll.addEventListener('click', () => this.downloadAllZip());
  },

  checkFitModeVisibility() {
    // If BOTH dims are specified AND lock is OFF, we might enforce fit modes.
    // Actually, if we type hard logic Width x Height without aspect match, we need to know how to fit it.
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
    
    // Percentage presets
    if (val === 'perc-50' || val === 'perc-25') {
      this.settings.width = 0; // Means we scale dynamically based on image
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
      this.elements.aspectLock.checked = false; // Preset usually means exact HW
      this.settings.aspectLock = false;
    }
    this.checkFitModeVisibility();
  },

  handleDimChange(changed) {
    if (this.settings.aspectLock && this.images.length > 0) {
      // Use the first image's aspect ratio as reference
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

  // -------------------- UPLOAD & FETCH FETCH -------------------- //
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

        // If this is the first image and we have no dimensions SET, init dimensions
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

  // -------------------- RENDERING -------------------- //
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
    
    // Check if we show bulk download
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
      let dimStr = img.resultBlob ? `${img.originalWidth}x${img.originalHeight} → ${img.newWidth}x${img.newHeight}` : `${img.originalWidth}x${img.originalHeight}`;

      let src = img.resultDataUrl || img.originalImage.src;

      card.innerHTML = `
        <div class="image-card-header">
          <span class="img-name" title="${img.name}">${img.name}</span>
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

  // -------------------- PROCESSING -------------------- //
  async processAll() {
    if (this.images.length === 0) return;
    this.elements.btnProcessAll.textContent = "Processing...";
    this.elements.btnProcessAll.disabled = true;

    for (let i = 0; i < this.images.length; i++) {
      await this.processImage(this.images[i]);
    }

    this.renderList();
    this.elements.btnProcessAll.textContent = "🔄 Resize All";
    this.elements.btnProcessAll.disabled = false;
  },

  processImage(imgObj) {
    return new Promise((resolve) => {
      let targetW = this.settings.width;
      let targetH = this.settings.height;

      // Handle Percentage Logic
      if (this.settings.preset === 'perc-50') {
        targetW = Math.round(imgObj.originalWidth * 0.5);
        targetH = Math.round(imgObj.originalHeight * 0.5);
      } else if (this.settings.preset === 'perc-25') {
        targetW = Math.round(imgObj.originalWidth * 0.25);
        targetH = Math.round(imgObj.originalHeight * 0.25);
      } else if (targetW === 0 || targetH === 0) {
        // Fallback to original if 0
        targetW = imgObj.originalWidth;
        targetH = imgObj.originalHeight;
      }

      // Handle Aspect Lock (Calculate based on this specific image if it was locked)
      if (this.settings.aspectLock && this.settings.preset === 'custom') {
        const ratio = imgObj.originalWidth / imgObj.originalHeight;
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

      // Decide how to draw
      if (this.settings.aspectLock || this.settings.preset.startsWith('perc')) {
        // Just draw stretched (it's proportional anyway)
        ctx.drawImage(imgObj.originalImage, 0, 0, targetW, targetH);
      } else {
        // We have strict TargetW and TargetH, and aspect unlocked. 
        if (this.settings.fitMode === 'cover') {
          // Crop it
          const scale = Math.max(targetW / imgObj.originalWidth, targetH / imgObj.originalHeight);
          const drawW = imgObj.originalWidth * scale;
          const drawH = imgObj.originalHeight * scale;
          const x = (targetW - drawW) / 2;
          const y = (targetH - drawH) / 2;
          ctx.drawImage(imgObj.originalImage, x, y, drawW, drawH);
        } else {
          // Contain (pad)
          const scale = Math.min(targetW / imgObj.originalWidth, targetH / imgObj.originalHeight);
          const drawW = imgObj.originalWidth * scale;
          const drawH = imgObj.originalHeight * scale;
          const x = (targetW - drawW) / 2;
          const y = (targetH - drawH) / 2;
          // Apply background based on format? If JPG, put white background
          let outTypeStr = this.settings.format === 'original' ? imgObj.file.type : this.settings.format;
          if (outTypeStr === 'image/jpeg') {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, targetW, targetH);
          }
          ctx.drawImage(imgObj.originalImage, x, y, drawW, drawH);
        }
      }

      // Export
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
        
        // Update name
        const baseName = imgObj.name.substring(0, imgObj.name.lastIndexOf('.')) || imgObj.name;
        imgObj.name = `${baseName}_resized.${ext}`;

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
      
      const promises = this.images.map(img => {
        if (img.resultBlob) {
          return zipWriter.add(img.name, new zip.BlobReader(img.resultBlob));
        }
      });
      
      await Promise.all(promises);
      const zipBlob = await zipWriter.close();
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `resized_images_${Date.now()}.zip`;
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
