/* ============================================================
 * PDF Suite — script.js
 * All-in-one PDF toolkit: Merge, Split, Rotate, Page #, Metadata, Reorder
 * 100% Client-Side · pdf-lib + pdf.js + zip.js + SortableJS
 * ============================================================ */

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ──────────────────────────────────────────
   APP — Core utilities & shared helpers
   ────────────────────────────────────────── */
const App = {

  // ═══════ TOAST ═══════
  toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ️') +
      '</span><span>' + msg + '</span>';
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  },

  // ═══════ PROGRESS ═══════
  showProgress(title) {
    document.getElementById('progress-title').textContent = title || 'Processing...';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = '0%';
    document.getElementById('progress-overlay').classList.remove('hidden');
  },
  updateProgress(pct, text) {
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent = text || Math.round(pct) + '%';
  },
  hideProgress() {
    document.getElementById('progress-overlay').classList.add('hidden');
  },

  // ═══════ UTILITIES ═══════
  formatBytes(b) {
    if (b === 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
  },

  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  },

  // ═══════ PDF.JS THUMBNAIL RENDERER ═══════
  async renderThumb(data, pageNum, width) {
    pageNum = pageNum || 1;
    width = width || 120;
    const arr = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arr) }).promise;
    const page = await pdf.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const scale = width / vp.width;
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    pdf.destroy();
    return canvas;
  },

  async renderAllThumbs(data, width, onProgress) {
    width = width || 120;
    const arr = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arr) }).promise;
    const canvases = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const scale = width / vp.width;
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      canvases.push(canvas);
      if (onProgress) onProgress(i, pdf.numPages);
    }
    const total = pdf.numPages;
    pdf.destroy();
    return { canvases: canvases, total: total };
  },

  // ═══════ DROPZONE HELPER ═══════
  initDropzone(dzId, inputId, onFiles, multiple) {
    const dz = document.getElementById(dzId);
    const input = document.getElementById(inputId);
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (!files.length) { App.toast('Please drop PDF files only.', 'error'); return; }
      onFiles(multiple ? files : [files[0]]);
    });
    input.addEventListener('change', e => {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length) onFiles(multiple ? files : [files[0]]);
      input.value = '';
    });
  },

  // ═══════ CANVAS CLONE (deep copy pixels) ═══════
  cloneCanvas(src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  },

  // ═══════ TAB MANAGEMENT ═══════
  initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  },

  /* ════════════════════════════════════════════
     MODULE: MERGE
     ════════════════════════════════════════════ */
  merge: {
    files: [],
    sortable: null,

    init() {
      App.initDropzone('dz-merge', 'input-merge', f => this.addFiles(f), true);
      document.getElementById('btn-merge').addEventListener('click', () => this.execute());
      document.getElementById('btn-merge-clear').addEventListener('click', () => this.clear());
    },

    async addFiles(files) {
      for (const f of files) {
        try {
          const bytes = await f.arrayBuffer();
          const doc = await PDFLib.PDFDocument.load(bytes);
          const pageCount = doc.getPageCount();
          const thumb = await App.renderThumb(bytes, 1, 96);
          this.files.push({
            id: 'f_' + Math.random().toString(36).substr(2, 8),
            name: f.name, size: f.size, file: f, pageCount: pageCount, thumb: thumb
          });
        } catch (e) {
          App.toast('Error loading ' + f.name, 'error');
        }
      }
      this.render();
    },

    render() {
      const list = document.getElementById('merge-list');
      const empty = document.getElementById('merge-empty');
      const result = document.getElementById('merge-result');
      const btnM = document.getElementById('btn-merge');
      const btnC = document.getElementById('btn-merge-clear');

      result.classList.add('hidden');

      if (!this.files.length) {
        list.classList.add('hidden'); empty.classList.remove('hidden');
        btnM.classList.add('hidden'); btnC.classList.add('hidden');
        return;
      }

      list.classList.remove('hidden'); empty.classList.add('hidden');
      btnC.classList.remove('hidden');
      btnM.classList.toggle('hidden', this.files.length < 2);

      list.innerHTML = '';
      this.files.forEach((f) => {
        const card = document.createElement('div');
        card.className = 'merge-card';
        card.dataset.id = f.id;

        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '⠿';

        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'merge-thumb';
        thumbDiv.appendChild(App.cloneCanvas(f.thumb));

        const infoDiv = document.createElement('div');
        infoDiv.className = 'merge-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'merge-name';
        nameEl.title = f.name;
        nameEl.textContent = f.name;
        const metaEl = document.createElement('div');
        metaEl.className = 'merge-meta';
        metaEl.textContent = f.pageCount + ' pages · ' + App.formatBytes(f.size);
        infoDiv.appendChild(nameEl);
        infoDiv.appendChild(metaEl);

        const actDiv = document.createElement('div');
        actDiv.className = 'merge-actions';
        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn-icon-only';
        rmBtn.textContent = '✕';
        rmBtn.title = 'Remove';
        rmBtn.addEventListener('click', () => {
          this.files = this.files.filter(x => x.id !== f.id);
          this.render();
        });
        actDiv.appendChild(rmBtn);

        card.appendChild(handle);
        card.appendChild(thumbDiv);
        card.appendChild(infoDiv);
        card.appendChild(actDiv);
        list.appendChild(card);
      });

      if (this.sortable) this.sortable.destroy();
      this.sortable = new Sortable(list, {
        handle: '.drag-handle',
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: () => {
          const order = [];
          list.querySelectorAll('.merge-card').forEach(c => {
            const item = this.files.find(x => x.id === c.dataset.id);
            if (item) order.push(item);
          });
          this.files = order;
        }
      });
    },

    async execute() {
      if (this.files.length < 2) return;
      const btn = document.getElementById('btn-merge');
      btn.disabled = true;
      App.showProgress('Merging PDFs...');
      try {
        const merged = await PDFLib.PDFDocument.create();
        let totalOrig = 0;
        for (let i = 0; i < this.files.length; i++) {
          App.updateProgress((i / this.files.length) * 90,
            'File ' + (i + 1) + '/' + this.files.length + ': ' + this.files[i].name);
          const bytes = await this.files[i].file.arrayBuffer();
          totalOrig += this.files[i].size;
          const doc = await PDFLib.PDFDocument.load(bytes);
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        App.updateProgress(95, 'Saving...');
        const pdfBytes = await merged.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fname = (document.getElementById('merge-filename').value.trim() || 'Merged_Document') + '.pdf';
        App.download(blob, fname);
        App.updateProgress(100, 'Done!');

        const r = document.getElementById('merge-result');
        r.classList.remove('hidden');
        r.innerHTML = '<div class="result-card"><h3>✅ Merge Complete!</h3>' +
          '<div class="result-stats">' +
          '<div class="result-stat"><div class="val">' + this.files.length + '</div><div class="lbl">Files</div></div>' +
          '<div class="result-stat"><div class="val">' + App.formatBytes(totalOrig) + '</div><div class="lbl">Original</div></div>' +
          '<div class="result-stat"><div class="val">' + App.formatBytes(pdfBytes.length) + '</div><div class="lbl">Output</div></div>' +
          '</div></div>';
        App.toast('PDFs merged successfully!', 'success');
      } catch (e) {
        console.error(e);
        App.toast('Error merging: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        App.hideProgress();
      }
    },

    clear() {
      this.files = [];
      if (this.sortable) { this.sortable.destroy(); this.sortable = null; }
      document.getElementById('merge-result').classList.add('hidden');
      this.render();
      App.toast('Merge list cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     MODULE: SPLIT
     ════════════════════════════════════════════ */
  split: {
    file: null,
    pdfBytes: null,
    totalPages: 0,
    selected: new Set(),

    init() {
      App.initDropzone('dz-split', 'input-split', f => this.loadFile(f[0]), false);
      document.getElementById('btn-split-zip').addEventListener('click', () => this.dlZip());
      document.getElementById('btn-split-single').addEventListener('click', () => this.dlSingle());
      document.getElementById('btn-split-clear').addEventListener('click', () => this.clear());
      document.getElementById('btn-apply-range').addEventListener('click', () => this.applyRange());
      document.querySelectorAll('#tab-split .preset-btn').forEach(b =>
        b.addEventListener('click', () => this.applyPreset(b.dataset.preset)));
    },

    async loadFile(file) {
      try {
        App.showProgress('Loading PDF...');
        this.pdfBytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        this.totalPages = doc.getPageCount();
        this.file = file;
        this.selected.clear();
        for (let i = 1; i <= this.totalPages; i++) this.selected.add(i);

        const { canvases } = await App.renderAllThumbs(this.pdfBytes, 160, (i, t) => {
          App.updateProgress(20 + (i / t) * 75, 'Rendering page ' + i + '/' + t);
        });

        const grid = document.getElementById('split-grid');
        grid.innerHTML = '';
        grid.classList.remove('hidden');
        document.getElementById('split-empty').classList.add('hidden');
        document.getElementById('split-controls').classList.remove('hidden');

        canvases.forEach((canvas, i) => {
          const pn = i + 1;
          const div = document.createElement('div');
          div.className = 'page-thumb selected';
          div.dataset.page = pn;
          div.appendChild(canvas);

          const check = document.createElement('div');
          check.className = 'thumb-check';
          check.textContent = '✓';
          div.appendChild(check);

          const dlBtn = document.createElement('button');
          dlBtn.className = 'single-dl';
          dlBtn.title = 'Download page ' + pn;
          dlBtn.textContent = '⬇';
          dlBtn.addEventListener('click', e => { e.stopPropagation(); this.dlOnePage(pn); });
          div.appendChild(dlBtn);

          const label = document.createElement('div');
          label.className = 'page-thumb-label';
          label.textContent = 'Page ' + pn;
          div.appendChild(label);

          div.addEventListener('click', e => {
            if (e.target === dlBtn) return;
            if (this.selected.has(pn)) { this.selected.delete(pn); div.classList.remove('selected'); }
            else { this.selected.add(pn); div.classList.add('selected'); }
            this.updateInfo();
          });

          grid.appendChild(div);
        });

        this.updateInfo();
        App.hideProgress();
        App.toast('Loaded: ' + file.name + ' (' + this.totalPages + ' pages)', 'success');
      } catch (e) {
        console.error(e);
        App.hideProgress();
        App.toast('Error loading PDF: ' + e.message, 'error');
      }
    },

    updateInfo() {
      document.getElementById('split-info-text').textContent =
        this.selected.size + ' of ' + this.totalPages + ' pages selected';
    },

    applyPreset(p) {
      this.selected.clear();
      const h = Math.ceil(this.totalPages / 2);
      for (let i = 1; i <= this.totalPages; i++) {
        if (p === 'all') this.selected.add(i);
        else if (p === 'odd' && i % 2 === 1) this.selected.add(i);
        else if (p === 'even' && i % 2 === 0) this.selected.add(i);
        else if (p === 'first-half' && i <= h) this.selected.add(i);
        else if (p === 'last-half' && i > h) this.selected.add(i);
      }
      document.querySelectorAll('#split-grid .page-thumb').forEach(el =>
        el.classList.toggle('selected', this.selected.has(parseInt(el.dataset.page))));
      this.updateInfo();
    },

    applyRange() {
      const str = document.getElementById('split-range').value.trim();
      if (!str) return;
      this.selected.clear();
      str.replace(/\s+/g, '').split(',').forEach(part => {
        if (part.includes('-')) {
          let [a, b] = part.split('-').map(Number);
          if (isNaN(a) || isNaN(b)) return;
          if (a > b) [a, b] = [b, a];
          for (let i = Math.max(1, a); i <= Math.min(this.totalPages, b); i++) this.selected.add(i);
        } else {
          const n = parseInt(part);
          if (!isNaN(n) && n >= 1 && n <= this.totalPages) this.selected.add(n);
        }
      });
      document.querySelectorAll('#split-grid .page-thumb').forEach(el =>
        el.classList.toggle('selected', this.selected.has(parseInt(el.dataset.page))));
      this.updateInfo();
      App.toast(this.selected.size + ' pages selected via range.', 'info');
    },

    async dlZip() {
      if (!this.selected.size) { App.toast('No pages selected.', 'error'); return; }
      App.showProgress('Creating ZIP...');
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const name = this.file.name.replace(/\.pdf$/i, '');
        const zw = new zip.ZipWriter(new zip.BlobWriter('application/zip'));
        const sorted = Array.from(this.selected).sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
          App.updateProgress((i / sorted.length) * 90, 'Page ' + sorted[i] + '...');
          const nd = await PDFLib.PDFDocument.create();
          const [pg] = await nd.copyPages(doc, [sorted[i] - 1]);
          nd.addPage(pg);
          const bytes = await nd.save();
          await zw.add(name + '_page_' + sorted[i] + '.pdf',
            new zip.BlobReader(new Blob([bytes], { type: 'application/pdf' })));
        }
        App.updateProgress(95, 'Finalizing...');
        const zb = await zw.close();
        App.download(zb, name + '_split.zip');
        App.hideProgress();
        App.toast(sorted.length + ' pages downloaded as ZIP!', 'success');
      } catch (e) {
        console.error(e); App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    async dlSingle() {
      if (!this.selected.size) { App.toast('No pages selected.', 'error'); return; }
      App.showProgress('Extracting pages...');
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const nd = await PDFLib.PDFDocument.create();
        const sorted = Array.from(this.selected).sort((a, b) => a - b);
        const pages = await nd.copyPages(doc, sorted.map(p => p - 1));
        pages.forEach(p => nd.addPage(p));
        const bytes = await nd.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        App.download(blob, this.file.name.replace(/\.pdf$/i, '') + '_extracted.pdf');
        App.hideProgress();
        App.toast(sorted.length + ' pages merged into 1 PDF!', 'success');
      } catch (e) {
        App.hideProgress(); App.toast('Error: ' + e.message, 'error');
      }
    },

    async dlOnePage(pn) {
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const nd = await PDFLib.PDFDocument.create();
        const [pg] = await nd.copyPages(doc, [pn - 1]);
        nd.addPage(pg);
        const bytes = await nd.save();
        App.download(new Blob([bytes], { type: 'application/pdf' }),
          this.file.name.replace(/\.pdf$/i, '') + '_page_' + pn + '.pdf');
        App.toast('Downloaded page ' + pn, 'success');
      } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    },

    clear() {
      this.file = null; this.pdfBytes = null; this.totalPages = 0; this.selected.clear();
      document.getElementById('split-grid').innerHTML = '';
      document.getElementById('split-grid').classList.add('hidden');
      document.getElementById('split-empty').classList.remove('hidden');
      document.getElementById('split-controls').classList.add('hidden');
      document.getElementById('split-range').value = '';
      App.toast('Split cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     MODULE: ROTATE
     ════════════════════════════════════════════ */
  rotate: {
    file: null, pdfBytes: null, totalPages: 0,
    rotations: [],

    init() {
      App.initDropzone('dz-rotate', 'input-rotate', f => this.loadFile(f[0]), false);
      document.getElementById('btn-rotate-dl').addEventListener('click', () => this.execute());
      document.getElementById('btn-rotate-clear').addEventListener('click', () => this.clear());
      document.querySelectorAll('[data-bulk-rotate]').forEach(b =>
        b.addEventListener('click', () => this.bulkRotate(parseInt(b.dataset.bulkRotate))));
    },

    async loadFile(file) {
      try {
        App.showProgress('Loading PDF...');
        this.pdfBytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        this.totalPages = doc.getPageCount();
        this.file = file;
        this.rotations = new Array(this.totalPages).fill(0);

        const { canvases } = await App.renderAllThumbs(this.pdfBytes, 160, (i, t) =>
          App.updateProgress(20 + (i / t) * 75, 'Page ' + i + '/' + t));

        const grid = document.getElementById('rotate-grid');
        grid.innerHTML = '';
        grid.classList.remove('hidden');
        document.getElementById('rotate-empty').classList.add('hidden');
        document.getElementById('rotate-controls').classList.remove('hidden');

        canvases.forEach((canvas, i) => {
          const div = document.createElement('div');
          div.className = 'page-thumb';
          div.dataset.index = i;
          canvas.style.transition = 'transform 0.3s ease';
          div.appendChild(canvas);

          const badge = document.createElement('div');
          badge.className = 'rotation-badge hidden';
          badge.dataset.ri = i;
          div.appendChild(badge);

          const controls = document.createElement('div');
          controls.className = 'rotate-controls';

          const btnL = document.createElement('button');
          btnL.className = 'rotate-btn';
          btnL.textContent = '↺';
          btnL.title = 'Rotate Left';
          btnL.addEventListener('click', e => { e.stopPropagation(); this.rotatePage(i, -1); });

          const btnR = document.createElement('button');
          btnR.className = 'rotate-btn';
          btnR.textContent = '↻';
          btnR.title = 'Rotate Right';
          btnR.addEventListener('click', e => { e.stopPropagation(); this.rotatePage(i, 1); });

          controls.appendChild(btnL);
          controls.appendChild(btnR);
          div.appendChild(controls);

          const label = document.createElement('div');
          label.className = 'page-thumb-label';
          label.textContent = 'Page ' + (i + 1);
          div.appendChild(label);

          grid.appendChild(div);
        });

        App.hideProgress();
        App.toast('Loaded: ' + file.name + ' (' + this.totalPages + ' pages)', 'success');
      } catch (e) {
        App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    rotatePage(idx, dir) {
      this.rotations[idx] = (this.rotations[idx] + dir * 90 + 360) % 360;
      const grid = document.getElementById('rotate-grid');
      const thumb = grid.children[idx];
      if (!thumb) return;
      thumb.querySelector('canvas').style.transform = 'rotate(' + this.rotations[idx] + 'deg)';
      const badge = thumb.querySelector('.rotation-badge');
      if (this.rotations[idx] === 0) {
        badge.classList.add('hidden');
      } else {
        badge.classList.remove('hidden');
        badge.textContent = this.rotations[idx] + '°';
      }
    },

    bulkRotate(deg) {
      for (let i = 0; i < this.totalPages; i++) {
        this.rotations[i] = deg;
        const grid = document.getElementById('rotate-grid');
        const thumb = grid.children[i];
        if (!thumb) continue;
        thumb.querySelector('canvas').style.transform = 'rotate(' + deg + 'deg)';
        const badge = thumb.querySelector('.rotation-badge');
        if (deg === 0) badge.classList.add('hidden');
        else { badge.classList.remove('hidden'); badge.textContent = deg + '°'; }
      }
      App.toast('All pages → ' + deg + '°', 'info');
    },

    async execute() {
      if (!this.pdfBytes) return;
      App.showProgress('Applying rotations...');
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const pages = doc.getPages();
        pages.forEach((pg, i) => {
          if (this.rotations[i]) {
            pg.setRotation(PDFLib.degrees(pg.getRotation().angle + this.rotations[i]));
          }
        });
        App.updateProgress(85, 'Saving...');
        const bytes = await doc.save();
        App.download(new Blob([bytes], { type: 'application/pdf' }),
          this.file.name.replace(/\.pdf$/i, '') + '_rotated.pdf');
        App.hideProgress();
        App.toast('Rotated PDF downloaded!', 'success');
      } catch (e) {
        App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    clear() {
      this.file = null; this.pdfBytes = null; this.totalPages = 0; this.rotations = [];
      document.getElementById('rotate-grid').innerHTML = '';
      document.getElementById('rotate-grid').classList.add('hidden');
      document.getElementById('rotate-empty').classList.remove('hidden');
      document.getElementById('rotate-controls').classList.add('hidden');
      App.toast('Rotate cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     MODULE: PAGE NUMBERS
     ════════════════════════════════════════════ */
  pagenum: {
    file: null, pdfBytes: null, totalPages: 0,
    position: 'bottom-center',

    init() {
      App.initDropzone('dz-pagenum', 'input-pagenum', f => this.loadFile(f[0]), false);
      document.getElementById('btn-pagenum-dl').addEventListener('click', () => this.execute());
      document.getElementById('btn-pagenum-clear').addEventListener('click', () => this.clear());
      document.querySelectorAll('.pos-btn').forEach(b => {
        b.addEventListener('click', () => {
          document.querySelectorAll('.pos-btn').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          this.position = b.dataset.pos;
        });
      });
    },

    async loadFile(file) {
      try {
        this.pdfBytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        this.totalPages = doc.getPageCount();
        this.file = file;
        document.getElementById('pagenum-empty').classList.add('hidden');
        document.getElementById('pagenum-info').classList.remove('hidden');
        document.getElementById('pagenum-controls').classList.remove('hidden');
        document.getElementById('pn-filename').textContent = file.name;
        document.getElementById('pn-pages').textContent = this.totalPages + ' Pages';
        document.getElementById('pn-size').textContent = App.formatBytes(file.size);
        App.toast('Loaded: ' + file.name, 'success');
      } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    },

    async execute() {
      if (!this.pdfBytes) return;
      App.showProgress('Adding page numbers...');
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const pages = doc.getPages();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
        const startNum = parseInt(document.getElementById('pagenum-start').value) || 1;
        const fmt = document.getElementById('pagenum-format').value;
        const fontSize = parseInt(document.getElementById('pagenum-size').value) || 11;
        const total = pages.length;
        const margin = 36;

        pages.forEach((page, i) => {
          const num = startNum + i;
          let text;
          if (fmt === 'page') text = 'Page ' + num;
          else if (fmt === 'dash') text = '— ' + num + ' —';
          else if (fmt === 'of') text = num + ' of ' + (total + startNum - 1);
          else text = '' + num;

          const { width, height } = page.getSize();
          const tw = font.widthOfTextAtSize(text, fontSize);
          const parts = this.position.split('-');
          const vPos = parts[0], hPos = parts[1];

          let x, y;
          if (hPos === 'left') x = margin;
          else if (hPos === 'right') x = width - tw - margin;
          else x = (width - tw) / 2;
          if (vPos === 'top') y = height - margin;
          else y = margin;

          page.drawText(text, {
            x: x, y: y, size: fontSize, font: font,
            color: PDFLib.rgb(0.3, 0.3, 0.3)
          });
          App.updateProgress((i / total) * 90, 'Page ' + (i + 1) + '/' + total);
        });

        App.updateProgress(95, 'Saving...');
        const bytes = await doc.save();
        App.download(new Blob([bytes], { type: 'application/pdf' }),
          this.file.name.replace(/\.pdf$/i, '') + '_numbered.pdf');
        App.hideProgress();
        App.toast('Page numbers added!', 'success');
      } catch (e) {
        App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    clear() {
      this.file = null; this.pdfBytes = null; this.totalPages = 0;
      document.getElementById('pagenum-info').classList.add('hidden');
      document.getElementById('pagenum-empty').classList.remove('hidden');
      document.getElementById('pagenum-controls').classList.add('hidden');
      App.toast('Cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     MODULE: METADATA (Protect tab)
     ════════════════════════════════════════════ */
  protect: {
    file: null, pdfBytes: null,

    init() {
      App.initDropzone('dz-protect', 'input-protect', f => this.loadFile(f[0]), false);
      document.getElementById('btn-protect-dl').addEventListener('click', () => this.execute());
      document.getElementById('btn-protect-clear').addEventListener('click', () => this.clear());
    },

    async loadFile(file) {
      try {
        this.pdfBytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        this.file = file;
        document.getElementById('meta-title').value = doc.getTitle() || '';
        document.getElementById('meta-author').value = doc.getAuthor() || '';
        document.getElementById('meta-subject').value = doc.getSubject() || '';
        document.getElementById('meta-keywords').value = doc.getKeywords() || '';
        document.getElementById('protect-empty').classList.add('hidden');
        document.getElementById('protect-info').classList.remove('hidden');
        document.getElementById('protect-controls').classList.remove('hidden');
        document.getElementById('mt-filename').textContent = file.name;
        document.getElementById('mt-pages').textContent = doc.getPageCount() + ' Pages';
        document.getElementById('mt-size').textContent = App.formatBytes(file.size);
        App.toast('Loaded: ' + file.name, 'success');
      } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    },

    async execute() {
      if (!this.pdfBytes) return;
      try {
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        const t = document.getElementById('meta-title').value.trim();
        const a = document.getElementById('meta-author').value.trim();
        const s = document.getElementById('meta-subject').value.trim();
        const k = document.getElementById('meta-keywords').value.trim();
        if (t) doc.setTitle(t);
        if (a) doc.setAuthor(a);
        if (s) doc.setSubject(s);
        if (k) doc.setKeywords(k.split(',').map(x => x.trim()));
        doc.setProducer('JoogadTools PDF Suite');
        doc.setCreator('JoogadTools');
        const bytes = await doc.save();
        App.download(new Blob([bytes], { type: 'application/pdf' }),
          this.file.name.replace(/\.pdf$/i, '') + '_metadata.pdf');
        App.toast('Metadata saved & downloaded!', 'success');
      } catch (e) { App.toast('Error: ' + e.message, 'error'); }
    },

    clear() {
      this.file = null; this.pdfBytes = null;
      document.getElementById('protect-info').classList.add('hidden');
      document.getElementById('protect-empty').classList.remove('hidden');
      document.getElementById('protect-controls').classList.add('hidden');
      App.toast('Cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     MODULE: REORDER
     ════════════════════════════════════════════ */
  reorder: {
    file: null, pdfBytes: null, totalPages: 0,
    order: [],
    sortable: null,

    init() {
      App.initDropzone('dz-reorder', 'input-reorder', f => this.loadFile(f[0]), false);
      document.getElementById('btn-reorder-dl').addEventListener('click', () => this.execute());
      document.getElementById('btn-reorder-clear').addEventListener('click', () => this.clear());
      document.getElementById('btn-reverse').addEventListener('click', () => this.reverse());
    },

    async loadFile(file) {
      try {
        App.showProgress('Loading PDF...');
        this.pdfBytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes);
        this.totalPages = doc.getPageCount();
        this.file = file;
        this.order = Array.from({ length: this.totalPages }, (_, i) => i + 1);

        const { canvases } = await App.renderAllThumbs(this.pdfBytes, 140, (i, t) =>
          App.updateProgress(20 + (i / t) * 75, 'Page ' + i + '/' + t));

        const grid = document.getElementById('reorder-grid');
        grid.innerHTML = '';
        grid.classList.remove('hidden');
        document.getElementById('reorder-empty').classList.add('hidden');
        document.getElementById('reorder-controls').classList.remove('hidden');

        canvases.forEach((canvas, i) => {
          const div = document.createElement('div');
          div.className = 'reorder-thumb';
          div.dataset.page = i + 1;
          div.appendChild(canvas);
          const label = document.createElement('div');
          label.className = 'reorder-thumb-label';
          label.textContent = 'Page ' + (i + 1);
          div.appendChild(label);
          grid.appendChild(div);
        });

        if (this.sortable) this.sortable.destroy();
        this.sortable = new Sortable(grid, {
          animation: 200,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          onEnd: () => this.syncOrder()
        });

        App.hideProgress();
        App.toast('Loaded: ' + file.name + ' (' + this.totalPages + ' pages)', 'success');
      } catch (e) {
        App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    syncOrder() {
      const grid = document.getElementById('reorder-grid');
      this.order = Array.from(grid.children).map(el => parseInt(el.dataset.page));
    },

    reverse() {
      const grid = document.getElementById('reorder-grid');
      const children = Array.from(grid.children).reverse();
      grid.innerHTML = '';
      children.forEach(el => grid.appendChild(el));
      this.syncOrder();
      App.toast('Page order reversed.', 'info');
    },

    async execute() {
      if (!this.pdfBytes || !this.order.length) return;
      App.showProgress('Reordering pages...');
      try {
        const src = await PDFLib.PDFDocument.load(this.pdfBytes);
        const nd = await PDFLib.PDFDocument.create();
        const pages = await nd.copyPages(src, this.order.map(p => p - 1));
        pages.forEach(p => nd.addPage(p));
        const bytes = await nd.save();
        App.download(new Blob([bytes], { type: 'application/pdf' }),
          this.file.name.replace(/\.pdf$/i, '') + '_reordered.pdf');
        App.hideProgress();
        App.toast('Reordered PDF downloaded!', 'success');
      } catch (e) {
        App.hideProgress();
        App.toast('Error: ' + e.message, 'error');
      }
    },

    clear() {
      this.file = null; this.pdfBytes = null; this.totalPages = 0; this.order = [];
      if (this.sortable) { this.sortable.destroy(); this.sortable = null; }
      document.getElementById('reorder-grid').innerHTML = '';
      document.getElementById('reorder-grid').classList.add('hidden');
      document.getElementById('reorder-empty').classList.remove('hidden');
      document.getElementById('reorder-controls').classList.add('hidden');
      App.toast('Cleared.', 'info');
    }
  },

  /* ════════════════════════════════════════════
     INIT — Bootstrap everything
     ════════════════════════════════════════════ */
  init() {
    this.initTabs();
    this.merge.init();
    this.split.init();
    this.rotate.init();
    this.pagenum.init();
    this.protect.init();
    this.reorder.init();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
