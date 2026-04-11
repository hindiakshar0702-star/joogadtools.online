const App = {
  images: [], // { id, name, originalBlob, originalDataUrl, resultBlob, resultDataUrl, status }
  
  init() {
    this.bindElements();
    this.bindEvents();
  },

  bindElements() {
    const el = id => document.getElementById(id);
    this.elements = {
      dropzone: el('dropzone'),
      fileInput: el('file-input'),
      urlInput: el('url-input'),
      btnFetchUrl: el('btn-fetch-url'),
      urlError: el('url-error'),
      
      bgType: el('bg-type'),
      customColorGroup: el('custom-color-group'),
      bgColorPicker: el('bg-color-picker'),
      bgColorLabel: el('bg-color-label'),

      btnProcessAll: el('btn-process-all'),
      btnDownloadAll: el('btn-download-all'),

      emptyState: el('empty-state'),
      progressState: el('ai-progress'),
      progressText: el('progress-text'),
      fileList: el('file-list')
    };
  },

  bindEvents() {
    // Background Selection
    this.elements.bgType.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        this.elements.customColorGroup.classList.remove('hidden');
      } else {
        this.elements.customColorGroup.classList.add('hidden');
      }
    });

    this.elements.bgColorPicker.addEventListener('input', (e) => {
      this.elements.bgColorLabel.textContent = e.target.value.toUpperCase();
    });

    // Upload & URL
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

    this.elements.btnFetchUrl.addEventListener('click', () => this.fetchImageFromUrl(this.elements.urlInput.value));

    // Actions
    this.elements.btnProcessAll.addEventListener('click', () => this.processAll());
    this.elements.btnDownloadAll.addEventListener('click', () => this.downloadAllZip());
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

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
    const id = 'img_' + Math.random().toString(36).substr(2, 9);
    const url = URL.createObjectURL(file);
    const item = {
      id,
      name: file.name,
      originalBlob: file,
      originalDataUrl: url,
      resultBlob: null,
      resultDataUrl: null,
      status: 'ready' // ready, processing, done, error
    };
    this.images.push(item);
    this.renderList();
  },

  removeImage(id) {
    this.images = this.images.filter(i => i.id !== id);
    this.renderList();
  },

  renderList() {
    const list = this.elements.fileList;
    if (this.images.length === 0) {
      list.classList.add('hidden');
      this.elements.emptyState.classList.remove('hidden');
      this.elements.btnProcessAll.classList.add('hidden');
      this.elements.btnDownloadAll.classList.add('hidden');
      return;
    }

    list.classList.remove('hidden');
    this.elements.emptyState.classList.add('hidden');
    
    // Check states
    const hasReady = this.images.some(img => img.status === 'ready' || img.status === 'error');
    if (hasReady) {
      this.elements.btnProcessAll.classList.remove('hidden');
    } else {
      this.elements.btnProcessAll.classList.add('hidden');
    }

    const hasDone = this.images.some(img => img.status === 'done');
    if (hasDone) {
      this.elements.btnDownloadAll.classList.remove('hidden');
    } else {
      this.elements.btnDownloadAll.classList.add('hidden');
    }

    list.innerHTML = '';
    this.images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'image-card glass-panel';
      
      let statusStr = '';
      if (img.status === 'ready') statusStr = '<span class="text-muted">Status: Ready</span>';
      else if (img.status === 'processing') statusStr = '<span class="text-accent" style="animation: pulse 1.5s infinite;">⏳ Processing AI...</span>';
      else if (img.status === 'error') statusStr = '<span class="text-danger">❌ Error</span>';
      else if (img.status === 'done') statusStr = `<span style="color:var(--success)">✅ Success (${this.formatBytes(img.resultBlob.size)})</span>`;

      // Visual Before/After
      let previewHtml = '';
      if (img.status === 'done') {
        previewHtml = `
          <div style="display:flex; height:150px; gap:4px;">
            <div style="flex:1; background: url('${img.originalDataUrl}') center/contain no-repeat; opacity:0.6; filter:grayscale(100%);" title="Before"></div>
            <div style="width:2px; background:var(--glass-border);"></div>
            <div style="flex:1; background: url('${img.resultDataUrl}') center/contain no-repeat ${this.getPreviewBg()};" title="After"></div>
          </div>
        `;
      } else {
        previewHtml = `<img src="${img.originalDataUrl}" style="max-width:100%; max-height:150px; object-fit:contain; border-radius:4px;">`;
      }

      card.innerHTML = `
        <div class="image-card-header">
          <span class="img-name" title="${img.name}">${img.name}</span>
          <button class="btn-icon text-danger" onclick="App.removeImage('${img.id}')" ${img.status === 'processing' ? 'disabled' : ''}>✕</button>
        </div>
        <div class="image-preview-wrap" style="padding: 4px;">
          ${previewHtml}
        </div>
        <div class="image-card-footer" style="flex-direction:column; align-items:flex-start; gap:8px;">
          <div style="font-size:0.8rem;">
            Orig: ${this.formatBytes(img.originalBlob.size)}<br>
            ${statusStr}
          </div>
          ${img.status === 'done' ? `<button class="btn btn-accent btn-sm w-full" onclick="App.downloadSingle('${img.id}')">⬇️ Download</button>` : ''}
        </div>
      `;
      list.appendChild(card);
    });
  },

  getPreviewBg() {
    const type = this.elements.bgType.value;
    if (type === 'white') return '#ffffff';
    if (type === 'custom') return this.elements.bgColorPicker.value;
    return 'transparent';
  },

  async processAll() {
    const toProcess = this.images.filter(img => img.status === 'ready' || img.status === 'error');
    if (toProcess.length === 0) return;

    this.elements.btnProcessAll.textContent = "Processing...";
    this.elements.btnProcessAll.disabled = true;

    // Show AI progress overlay on first item if model not loaded
    // Since we don't have a direct hook into imglyRemoveBackground progress easily without config,
    // We just show a global spinner state for the first item which takes longest.
    this.elements.progressState.classList.remove('hidden');
    this.elements.progressText.textContent = "AI is computing. This might take 10-30s on first run...";

    for (let i = 0; i < toProcess.length; i++) {
        const item = toProcess[i];
        item.status = 'processing';
        this.renderList();

        try {
            await this.processImage(item);
            item.status = 'done';
        } catch (err) {
            console.error("AI Error:", err);
            item.status = 'error';
        }
    }

    this.elements.progressState.classList.add('hidden');
    this.renderList();
    this.elements.btnProcessAll.textContent = "✨ Remove Background";
    this.elements.btnProcessAll.disabled = false;
  },

  async processImage(imgObj) {
    // 1. Run AI to get Transparent PNG Blob
    const transparentBlob = await imglyRemoveBackground(imgObj.originalBlob);

    // 2. Determine final output based on settings
    const bgType = this.elements.bgType.value;
    
    if (bgType === 'transparent') {
        imgObj.resultBlob = transparentBlob;
        imgObj.resultDataUrl = URL.createObjectURL(transparentBlob);
        
        let ext = 'png';
        const baseName = imgObj.name.substring(0, imgObj.name.lastIndexOf('.')) || imgObj.name;
        imgObj.downName = `${baseName}_nobg.${ext}`;
        return;
    }

    // Handing Solid Colors (Needs Drawing to Canvas)
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(transparentBlob);
        img.onload = () => {
             const canvas = document.createElement('canvas');
             canvas.width = img.width;
             canvas.height = img.height;
             const ctx = canvas.getContext('2d');

             if (bgType === 'white') {
                 ctx.fillStyle = '#ffffff';
             } else if (bgType === 'custom') {
                 ctx.fillStyle = this.elements.bgColorPicker.value;
             }
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.drawImage(img, 0, 0);

             canvas.toBlob((finalBlob) => {
                 imgObj.resultBlob = finalBlob;
                 imgObj.resultDataUrl = URL.createObjectURL(finalBlob);
                 
                 let ext = 'jpg';
                 const baseName = imgObj.name.substring(0, imgObj.name.lastIndexOf('.')) || imgObj.name;
                 imgObj.downName = `${baseName}_nobg.${ext}`;

                 URL.revokeObjectURL(url);
                 resolve();
             }, 'image/jpeg', 0.95);
        };
        img.onerror = reject;
        img.src = url;
    });
  },

  downloadSingle(id) {
    const imgInfo = this.images.find(i => i.id === id);
    if (!imgInfo || !imgInfo.resultBlob) return;
    const a = document.createElement('a');
    a.href = imgInfo.resultDataUrl;
    a.download = imgInfo.downName;
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
      const doneImages = this.images.filter(img => img.status === 'done');
      
      const promises = doneImages.map(img => {
          return zipWriter.add(img.downName, new zip.BlobReader(img.resultBlob));
      });
      
      await Promise.all(promises);
      const zipBlob = await zipWriter.close();
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Removed_Backgrounds_${Date.now()}.zip`;
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
