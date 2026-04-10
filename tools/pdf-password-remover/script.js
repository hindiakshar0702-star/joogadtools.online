/**
 * PDF Password Remover
 * 100% Client-Side PDF Unlocking using pdf-lib
 */

const App = {
  // Elements
  dropzone: document.getElementById('pdf-dropzone'),
  fileInput: document.getElementById('pdf-file'),
  fileInfo: document.getElementById('file-info'),
  fileName: document.getElementById('file-name'),
  fileSize: document.getElementById('file-size'),
  btnRemoveFile: document.getElementById('btn-remove-file'),

  passwordInput: document.getElementById('pdf-password'),
  btnTogglePw: document.getElementById('btn-toggle-pw'),
  btnUnlock: document.getElementById('btn-unlock'),

  progressWrap: document.getElementById('progress-wrap'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),

  resultEmpty: document.getElementById('result-empty'),
  resultSuccess: document.getElementById('result-success'),
  resultError: document.getElementById('result-error'),
  errorMessage: document.getElementById('error-message'),

  metaOriginal: document.getElementById('meta-original'),
  metaUnlocked: document.getElementById('meta-unlocked'),
  metaPages: document.getElementById('meta-pages'),
  btnDownload: document.getElementById('btn-download'),

  // State
  currentFile: null,      // File object
  currentBytes: null,     // ArrayBuffer of uploaded PDF
  unlockedBytes: null,    // Uint8Array of unlocked PDF
  unlockedFileName: '',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Dropzone
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('drag-over');
    });
    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('drag-over');
    });
    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleFileUpload(e.dataTransfer.files[0]);
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleFileUpload(e.target.files[0]);
    });

    // Remove file
    this.btnRemoveFile.addEventListener('click', () => this.removeFile());

    // Toggle password visibility
    this.btnTogglePw.addEventListener('click', () => {
      const isPassword = this.passwordInput.type === 'password';
      this.passwordInput.type = isPassword ? 'text' : 'password';
      this.btnTogglePw.textContent = isPassword ? '🙈' : '👁️';
    });

    // Unlock
    this.btnUnlock.addEventListener('click', () => this.unlockPdf());

    // Download
    this.btnDownload.addEventListener('click', () => this.downloadUnlocked());
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  handleFileUpload(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a PDF file.');
      return;
    }

    this.currentFile = file;
    this.fileName.textContent = file.name;
    this.fileSize.textContent = this.formatSize(file.size);

    // Read as ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentBytes = e.target.result;
      this.btnUnlock.disabled = false;
    };
    reader.readAsArrayBuffer(file);

    // Show file info, hide dropzone
    this.dropzone.classList.add('hidden');
    this.fileInfo.classList.remove('hidden');

    // Reset result
    this.resetResult();
  },

  removeFile() {
    this.currentFile = null;
    this.currentBytes = null;
    this.unlockedBytes = null;
    this.fileInput.value = '';

    this.dropzone.classList.remove('hidden');
    this.fileInfo.classList.add('hidden');
    this.btnUnlock.disabled = true;
    this.passwordInput.value = '';

    this.resetResult();
  },

  resetResult() {
    this.resultEmpty.classList.remove('hidden');
    this.resultSuccess.classList.add('hidden');
    this.resultError.classList.add('hidden');
    this.progressWrap.classList.add('hidden');
    this.progressFill.style.width = '0%';
  },

  showProgress(percent, text) {
    this.progressWrap.classList.remove('hidden');
    this.progressFill.style.width = percent + '%';
    this.progressText.textContent = text;
  },

  async unlockPdf() {
    if (!this.currentBytes) return;

    // Reset UI
    this.resultEmpty.classList.add('hidden');
    this.resultSuccess.classList.add('hidden');
    this.resultError.classList.add('hidden');
    this.btnUnlock.disabled = true;
    this.btnUnlock.innerHTML = '⏳ Processing...';

    this.showProgress(10, 'Reading PDF...');
    await new Promise(r => setTimeout(r, 100));

    try {
      const password = this.passwordInput.value || '';
      const { PDFDocument } = PDFLib;

      this.showProgress(30, 'Attempting to load PDF...');
      await new Promise(r => setTimeout(r, 100));

      // Try loading the PDF - pdf-lib handles decryption
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(this.currentBytes, {
          password: password,
          ignoreEncryption: false,
        });
      } catch (loadErr) {
        // If password was empty, try with ignoreEncryption for owner-only protected PDFs
        if (!password) {
          try {
            pdfDoc = await PDFDocument.load(this.currentBytes, {
              ignoreEncryption: true,
            });
          } catch (ignoreErr) {
            throw new Error('This PDF requires a password to open. Please enter the correct password and try again.');
          }
        } else {
          throw new Error('Incorrect password or the PDF is corrupted. Please check and try again.');
        }
      }

      this.showProgress(60, 'Removing encryption...');
      await new Promise(r => setTimeout(r, 100));

      // Create a brand new PDF and copy all pages
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => newPdf.addPage(page));

      // Copy metadata
      const title = pdfDoc.getTitle();
      const author = pdfDoc.getAuthor();
      const subject = pdfDoc.getSubject();
      if (title) newPdf.setTitle(title);
      if (author) newPdf.setAuthor(author);
      if (subject) newPdf.setSubject(subject);

      this.showProgress(85, 'Saving unlocked PDF...');
      await new Promise(r => setTimeout(r, 100));

      // Save without encryption
      this.unlockedBytes = await newPdf.save();
      const pageCount = newPdf.getPageCount();

      // Generate filename
      const originalName = this.currentFile.name.replace(/\.pdf$/i, '');
      this.unlockedFileName = `${originalName}_unlocked.pdf`;

      this.showProgress(100, 'Done!');

      // Show success
      this.metaOriginal.textContent = this.formatSize(this.currentBytes.byteLength);
      this.metaUnlocked.textContent = this.formatSize(this.unlockedBytes.length);
      this.metaPages.textContent = pageCount;

      this.resultSuccess.classList.remove('hidden');
      this.resultError.classList.add('hidden');

    } catch (err) {
      console.error('Unlock Error:', err);
      this.errorMessage.textContent = err.message || 'An unknown error occurred while processing the PDF.';
      this.resultError.classList.remove('hidden');
      this.resultSuccess.classList.add('hidden');
    } finally {
      this.btnUnlock.innerHTML = '<span>🔓 Unlock & Remove Password</span>';
      this.btnUnlock.disabled = false;
      // Hide progress after a moment
      setTimeout(() => this.progressWrap.classList.add('hidden'), 1500);
    }
  },

  downloadUnlocked() {
    if (!this.unlockedBytes) return;

    const blob = new Blob([this.unlockedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.unlockedFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
