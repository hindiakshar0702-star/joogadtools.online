const App = {
  mergeFiles: [], // { id, name, size, file }
  splitFile: null, // { file, name, size, doc, numPages }

  init() {
    this.bindTabs();
    this.bindMerge();
    this.bindSplit();
  },

  bindTabs() {
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

  // ================= MERGE LOGIC =================

  bindMerge() {
    const dz = document.getElementById('dropzone-merge');
    const input = document.getElementById('file-merge');
    const btn = document.getElementById('btn-do-merge');

    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      if (e.dataTransfer.files) this.addMergeFiles(Array.from(e.dataTransfer.files));
    });
    input.addEventListener('change', e => {
      if (e.target.files) this.addMergeFiles(Array.from(e.target.files));
    });

    btn.addEventListener('click', () => this.executeMerge());
  },

  addMergeFiles(files) {
    const valid = files.filter(f => f.type === 'application/pdf');
    valid.forEach(f => {
      this.mergeFiles.push({
        id: 'pdf_' + Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: f.size,
        file: f
      });
    });
    this.renderMergeList();
  },

  removeMergeFile(id) {
    this.mergeFiles = this.mergeFiles.filter(f => f.id !== id);
    this.renderMergeList();
  },

  moveMergeFile(id, dir) {
    const idx = this.mergeFiles.findIndex(f => f.id === id);
    if (idx < 0) return;
    if (dir === -1 && idx > 0) {
      const temp = this.mergeFiles[idx];
      this.mergeFiles[idx] = this.mergeFiles[idx - 1];
      this.mergeFiles[idx - 1] = temp;
    } else if (dir === 1 && idx < this.mergeFiles.length - 1) {
      const temp = this.mergeFiles[idx];
      this.mergeFiles[idx] = this.mergeFiles[idx + 1];
      this.mergeFiles[idx + 1] = temp;
    }
    this.renderMergeList();
  },

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  renderMergeList() {
    const list = document.getElementById('list-merge');
    const empty = document.getElementById('empty-merge');
    const btn = document.getElementById('btn-do-merge');

    if (this.mergeFiles.length === 0) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      btn.classList.add('hidden');
      return;
    }

    list.classList.remove('hidden');
    empty.classList.add('hidden');
    
    if (this.mergeFiles.length >= 2) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }

    list.innerHTML = '';
    this.mergeFiles.forEach((file, index) => {
      const el = document.createElement('div');
      el.className = 'pdf-card';
      el.innerHTML = `
        <div class="pdf-info">
          <span class="pdf-name" title="${file.name}">${index + 1}. ${file.name}</span>
          <span class="pdf-meta">${this.formatBytes(file.size)}</span>
        </div>
        <div style="display:flex; gap: 4px;">
          <button class="btn-icon" onclick="App.moveMergeFile('${file.id}', -1)" ${index === 0 ? 'disabled' : ''}>⬆️</button>
          <button class="btn-icon" onclick="App.moveMergeFile('${file.id}', 1)" ${index === this.mergeFiles.length - 1 ? 'disabled' : ''}>⬇️</button>
          <button class="btn-icon text-danger" onclick="App.removeMergeFile('${file.id}')">✕</button>
        </div>
      `;
      list.appendChild(el);
    });
  },

  async executeMerge() {
    if (this.mergeFiles.length < 2) return;
    const btn = document.getElementById('btn-do-merge');
    btn.textContent = 'Merging...';
    btn.disabled = true;

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      
      for (const item of this.mergeFiles) {
        const bytes = await item.file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `Merged_Document_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
      alert('Error merging PDFs.');
    } finally {
      btn.textContent = '🔗 Merge PDFs';
      btn.disabled = false;
    }
  },


  // ================= SPLIT LOGIC =================

  bindSplit() {
    const dz = document.getElementById('dropzone-split');
    const input = document.getElementById('file-split');
    const btn = document.getElementById('btn-do-split');
    const radios = document.querySelectorAll('input[name="split-mode"]');
    const customInput = document.getElementById('custom-range-input');

    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) this.loadSplitFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) this.loadSplitFile(e.target.files[0]);
    });

    radios.forEach(r => r.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customInput.classList.remove('hidden');
      } else {
        customInput.classList.add('hidden');
      }
    }));

    btn.addEventListener('click', () => this.executeSplit());
  },

  async loadSplitFile(file) {
    if (file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.");
      return;
    }

    document.getElementById('empty-split').innerHTML = '<h2>Loading PDF...</h2>';

    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes);
      const numPages = doc.getPageCount();

      this.splitFile = {
        file,
        name: file.name,
        size: file.size,
        doc,
        numPages
      };

      document.getElementById('empty-split').classList.add('hidden');
      
      const infoDiv = document.getElementById('split-info');
      infoDiv.classList.remove('hidden');
      document.getElementById('split-filename').textContent = file.name;
      document.getElementById('split-pages').textContent = `${numPages} Pages`;
      document.getElementById('split-size').textContent = this.formatBytes(file.size);

      document.getElementById('split-settings').classList.remove('hidden');

    } catch (e) {
      console.error(e);
      alert("Failed to load PDF.");
      document.getElementById('empty-split').innerHTML = '<div class="empty-icon">📄</div><h2>Ready to Split</h2><p>Upload a PDF file to begin extracting pages.</p>';
    }
  },

  parseRange(rangeStr, maxPages) {
    const parts = rangeStr.replace(/\s+/g, '').split(',');
    let pagesToExtract = new Set();

    for (let part of parts) {
      if (!part) continue;
      if (part.includes('-')) {
        let [start, end] = part.split('-');
        start = parseInt(start);
        end = parseInt(end);
        if (isNaN(start) || isNaN(end)) continue;
        if (start < 1) start = 1;
        if (end > maxPages) end = maxPages;
        if (start > end) { let t = start; start = end; end = t; }
        for (let i = start; i <= end; i++) {
          pagesToExtract.add(i);
        }
      } else {
        let page = parseInt(part);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pagesToExtract.add(page);
        }
      }
    }
    return Array.from(pagesToExtract).sort((a,b)=>a-b);
  },

  async executeSplit() {
    if (!this.splitFile) return;

    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    const btn = document.getElementById('btn-do-split');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      const maxPages = this.splitFile.numPages;
      let pagesToExtract = [];

      if (mode === 'all') {
        for (let i=1; i<=maxPages; i++) pagesToExtract.push(i);
      } else {
        const rangeStr = document.getElementById('split-range').value;
        pagesToExtract = this.parseRange(rangeStr, maxPages);
        if (pagesToExtract.length === 0) {
          alert("Invalid or empty range provided.");
          btn.textContent = '✂️ Split PDF';
          btn.disabled = false;
          return;
        }
      }

      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
      const originalName = this.splitFile.name.replace(/\.pdf$/i, '');

      // Create separate PDF for each page selected (since it's a split operation)
      // Actually, if custom range, people usually want ONE pdf containing those pages.
      // E.g. "Extract page 1-3" -> returns a single PDF with pages 1, 2, 3.
      // If "all", we want 1 PDF per page inside a ZIP.
      
      if (mode === 'all') {
        // Zip approach
        for (let i = 0; i < pagesToExtract.length; i++) {
          const pageNum = pagesToExtract[i];
          const pageIdx = pageNum - 1; // 0-based
          const newDoc = await PDFLib.PDFDocument.create();
          const [copiedPage] = await newDoc.copyPages(this.splitFile.doc, [pageIdx]);
          newDoc.addPage(copiedPage);
          const pdfBytes = await newDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          await zipWriter.add(`${originalName}_page_${pageNum}.pdf`, new zip.BlobReader(blob));
        }

        const zipBlob = await zipWriter.close();
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${originalName}_Split.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);

      } else {
        // Single PDF extraction approach
        const newDoc = await PDFLib.PDFDocument.create();
        const indices = pagesToExtract.map(p => p - 1);
        const copiedPages = await newDoc.copyPages(this.splitFile.doc, indices);
        copiedPages.forEach(p => newDoc.addPage(p));
        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${originalName}_extracted.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

    } catch (e) {
      console.error(e);
      alert('Error splitting PDF.');
    } finally {
      btn.textContent = '✂️ Split PDF';
      btn.disabled = false;
    }
  }

};

document.addEventListener('DOMContentLoaded', () => App.init());
