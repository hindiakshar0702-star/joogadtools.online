/**
 * ZIP Master Tool
 * 100% Client-Side implementation using @zip.js/zip.js
 */

const App = {
  // Common
  DICTIONARY: [
    '','1234','12345','123456','1234567','12345678','123456789','1234567890',
    'password','Password','PASSWORD','password1','password123','pass','pass1234',
    'admin','admin123','Admin','Admin123','admin1','root','root123',
    'abc123','abc','abcdef','abcd1234','qwerty','qwerty123',
    'letmein','welcome','monkey','dragon','master','login','princess',
    'test','test123','guest','guest123','user','user123',
    '0000','1111','2222','3333','4444','5555','6666','7777','8888','9999',
    '0123','1010','2020','2021','2022','2023','2024','2025','2026',
    'iloveyou','sunshine','trustno1','football','baseball','shadow',
    'michael','jennifer','charlie','thomas','jessica','daniel','ashley',
    'access','hello','hello123','freedom','whatever','nothing',
    'secret','secret123','qwer1234','pass1','pass12','1q2w3e4r',
    '111111','222222','333333','444444','555555','666666','777777','888888','999999','000000',
    'aaaaaa','zzzzzz','asdf','asdfgh','asdf1234','zxcvbn',
    'india','india123','India','India123','bharat',
    'allah','allah123','bismillah','insha','masha',
    'google','facebook','twitter','instagram','youtube',
    'computer','internet','samsung','nokia','apple',
    'love','love123','lovely','lover','baby','honey',
    'star','star123','king','king123','prince','prince123',
    'lucky','lucky7','lucky13','diamond','gold','silver',
    'kumar','singh','khan','sharma','verma','gupta','patel',
    'rahul','amit','sanjay','vijay','raj','ravi','arun',
    'mumbai','delhi','pune','chennai','kolkata','bangalore',
    'school','college','student','teacher','office','company',
    'cricket','hockey','tennis','chess','football','game',
    'mobile','phone','smart','android','windows','linux',
    'money','bank','credit','debit','atm','pin',
    'summer','winter','spring','monday','friday','sunday',
    'red','blue','green','white','black','yellow','orange','purple',
    'one','two','three','four','five','six','seven','eight','nine','ten',
    'pdf','pdf123','file','file123','doc','doc123','document',
    'security','secure','private','protect','locked','unlock',
    'owner','creator','author','editor','viewer','reader',
    'p@ssw0rd','P@ssw0rd','p@ss','p@ss123','pa$$word','pa$$w0rd',
    'changeme','temp','temp123','default','default1',
    '102030','112233','121212','131313','141414','252525',
    'aaa111','bbb222','abc111','xyz123','xyz789',
    'super','super123','hero','hero123','power','power123',
    'system','system123','server','server123','network','net123',
  ],

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  async init() {
    this.bindTabs();
    this.initCompress();
    this.initExtract();
    this.initProtect();
    this.initUnlock();

    // Check if zip.js is loaded
    if (typeof zip === 'undefined') {
      alert("Failed to load core ZIP engine. Please check your internet connection.");
    } else {
      // Configure zip.js workers for performance
      zip.configure({
        useWebWorkers: true,
      });
    }
  },

  bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  },

  // =====================================
  // TAB 1: COMPRESS
  // =====================================
  compressState: {
    files: [], // Array of File objects
    blob: null
  },

  initCompress() {
    const dropzone = document.getElementById('compress-dropzone');
    const input = document.getElementById('compress-file-input');
    
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      this.addCompressFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', e => this.addCompressFiles(e.target.files));

    document.getElementById('btn-compress-start').addEventListener('click', () => this.startCompress());
    document.getElementById('btn-compress-download').addEventListener('click', () => {
      if (this.compressState.blob) this.downloadBlob(this.compressState.blob, 'archive.zip');
    });
  },

  addCompressFiles(files) {
    if (!files.length) return;
    this.compressState.files.push(...Array.from(files));
    this.renderCompressList();
  },

  removeCompressFile(index) {
    this.compressState.files.splice(index, 1);
    this.renderCompressList();
  },

  renderCompressList() {
    const list = document.getElementById('compress-file-list');
    const bar = document.getElementById('compress-action-bar');
    list.innerHTML = '';
    
    if (this.compressState.files.length === 0) {
      list.classList.add('hidden');
      bar.classList.add('hidden');
      return;
    }

    list.classList.remove('hidden');
    bar.classList.remove('hidden');

    let totalSize = 0;
    this.compressState.files.forEach((file, index) => {
      totalSize += file.size;
      const el = document.createElement('div');
      el.className = 'file-item';
      el.innerHTML = `
        <div class="file-item-name" title="${file.name}">📄 ${file.name}</div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="file-item-size">${this.formatSize(file.size)}</div>
          <button class="file-item-remove" data-index="${index}">✕</button>
        </div>
      `;
      list.appendChild(el);
    });

    document.getElementById('compress-total-files').textContent = this.compressState.files.length + ' files';
    document.getElementById('compress-total-size').textContent = this.formatSize(totalSize);

    list.querySelectorAll('.file-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => this.removeCompressFile(e.target.dataset.index));
    });
  },

  async startCompress() {
    if (this.compressState.files.length === 0) return;
    
    const ui = {
      bar: document.getElementById('compress-action-bar'),
      progWrap: document.getElementById('compress-progress'),
      progFill: document.getElementById('compress-progress-fill'),
      result: document.getElementById('compress-result'),
      resSize: document.getElementById('compress-result-size'),
      btn: document.getElementById('btn-compress-start')
    };

    ui.btn.disabled = true;
    ui.progWrap.classList.remove('hidden');
    ui.result.classList.add('hidden');
    
    try {
      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

      let processed = 0;
      const total = this.compressState.files.length;

      for (let file of this.compressState.files) {
        // We simulate a basic progress per file
        await zipWriter.add(file.name, new zip.BlobReader(file));
        processed++;
        const pct = Math.floor((processed / total) * 100);
        ui.progFill.style.width = pct + '%';
      }

      this.compressState.blob = await zipWriter.close();
      
      ui.resSize.textContent = this.formatSize(this.compressState.blob.size);
      ui.result.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert("Failed to create ZIP: " + err.message);
    } finally {
      ui.btn.disabled = false;
      setTimeout(() => ui.progWrap.classList.add('hidden'), 1000);
    }
  },

  // =====================================
  // TAB 2: EXTRACT
  // =====================================
  extractState: {
    entries: [], // zip.js entries
    zipReader: null
  },

  initExtract() {
    const dropzone = document.getElementById('extract-dropzone');
    const input = document.getElementById('extract-file-input');
    
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      if(e.dataTransfer.files.length) this.handleExtractUpload(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if(e.target.files.length) this.handleExtractUpload(e.target.files[0]);
    });

    document.getElementById('btn-extract-clear').addEventListener('click', () => this.clearExtract());
    document.getElementById('btn-extract-all').addEventListener('click', () => this.extractAll());
  },

  async handleExtractUpload(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return alert('Please upload a valid .zip file.');
    }

    document.getElementById('extract-dropzone').classList.add('hidden');
    document.getElementById('extract-tree-wrapper').classList.remove('hidden');
    document.getElementById('extract-file-name').textContent = file.name;
    document.getElementById('extract-file-size').textContent = this.formatSize(file.size);
    document.getElementById('extract-file-tree').innerHTML = '<div class="text-muted" style="text-align:center; padding: 2rem;">Reading archive...</div>';

    try {
      this.extractState.zipReader = new zip.ZipReader(new zip.BlobReader(file));
      this.extractState.entries = await this.extractState.zipReader.getEntries();
      this.renderExtractTree();
    } catch (err) {
      console.error(err);
      alert('Error reading ZIP file. It might be corrupted or encrypted.');
      this.clearExtract();
    }
  },

  renderExtractTree() {
    const tree = document.getElementById('extract-file-tree');
    tree.innerHTML = '';

    if (!this.extractState.entries || this.extractState.entries.length === 0) {
      tree.innerHTML = '<div class="text-muted" style="text-align:center; padding: 2rem;">Archive is empty.</div>';
      return;
    }

    this.extractState.entries.forEach((entry, idx) => {
      const el = document.createElement('div');
      el.className = 'tree-node';
      
      const isDir = entry.directory;
      el.dataset.type = isDir ? 'dir' : 'file';
      
      const parts = entry.filename.split('/').filter(p => p);
      const name = parts[parts.length - 1];
      const indent = (parts.length - 1) * 1.5;

      const icon = isDir ? '📁' : '📄';

      el.innerHTML = `
        <span class="tree-indent" style="width: ${indent}rem"></span>
        <span class="tree-icon">${icon}</span>
        <span class="tree-name" title="${entry.filename}">${name}</span>
        ${!isDir ? `<button class="tree-btn-dl" data-idx="${idx}">⬇️ Download</button>` : ''}
      `;
      tree.appendChild(el);
    });

    tree.querySelectorAll('.tree-btn-dl').forEach(btn => {
      btn.addEventListener('click', (e) => this.extractSingleFile(parseInt(e.target.dataset.idx)));
    });
  },

  async extractSingleFile(index) {
    const entry = this.extractState.entries[index];
    if (!entry || entry.directory) return;

    try {
      // Show progress
      const pWrap = document.getElementById('extract-progress');
      pWrap.classList.remove('hidden');
      document.getElementById('extract-progress-fill').style.width = '50%';
      document.getElementById('extract-progress-text').textContent = 'Extracting ' + entry.filename;

      const blob = await entry.getData(new zip.BlobWriter());
      
      document.getElementById('extract-progress-fill').style.width = '100%';
      
      // Get pure filename without path
      const parts = entry.filename.split('/');
      const name = parts[parts.length-1];

      this.downloadBlob(blob, name);
    } catch(err) {
      alert("Error extracting file: " + err.message);
    } finally {
      setTimeout(() => document.getElementById('extract-progress').classList.add('hidden'), 500);
    }
  },

  async extractAll() {
    if (!this.extractState.entries) return;
    
    // We cannot automatically download multiple files without asking for multiple permissions in browser.
    // Instead, we will notify the user or use a library to zip it again (pointless) or use File System Access API.
    // For simplicity, we fallback to telling user to download one by one, OR we can bundle in a single download if possible.
    alert("To prevent browser blocking multiple downloads, please click 'Download' next to individual files.");
  },

  clearExtract() {
    if (this.extractState.zipReader) {
      this.extractState.zipReader.close();
      this.extractState.zipReader = null;
    }
    this.extractState.entries = [];
    document.getElementById('extract-file-input').value = '';
    document.getElementById('extract-dropzone').classList.remove('hidden');
    document.getElementById('extract-tree-wrapper').classList.add('hidden');
  },


  // =====================================
  // TAB 3: PROTECT
  // =====================================
  protectState: {
    files: [],
    blob: null
  },

  initProtect() {
    const dropzone = document.getElementById('protect-dropzone');
    const input = document.getElementById('protect-file-input');
    
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      this.addProtectFiles(e.dataTransfer.files);
    });
    input.addEventListener('change', e => this.addProtectFiles(e.target.files));

    // UI binds
    document.getElementById('btn-toggle-pw-protect').addEventListener('click', () => {
      const inp = document.getElementById('protect-password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      document.getElementById('btn-toggle-pw-protect').textContent = inp.type === 'password' ? '👁️' : '🙈';
    });

    document.getElementById('protect-password').addEventListener('input', e => {
      document.getElementById('btn-protect-start').disabled = e.target.value.length === 0;
    });

    document.getElementById('btn-gen-pw').addEventListener('click', () => {
      const pw = this.generateRandomPassword(16);
      document.getElementById('generated-pw').textContent = pw;
      document.getElementById('pw-gen-output').classList.remove('hidden');
    });

    document.getElementById('btn-use-pw').addEventListener('click', () => {
      const pw = document.getElementById('generated-pw').textContent;
      document.getElementById('protect-password').value = pw;
      document.getElementById('protect-password').type = 'text';
      document.getElementById('btn-toggle-pw-protect').textContent = '🙈';
      document.getElementById('btn-protect-start').disabled = false;
    });

    document.getElementById('btn-protect-start').addEventListener('click', () => this.startProtect());
    document.getElementById('btn-protect-download').addEventListener('click', () => {
      if(this.protectState.blob) this.downloadBlob(this.protectState.blob, 'secure_archive.zip');
    });
  },

  generateRandomPassword(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    let pass = "";
    for(let i=0; i<length; i++) pass += chars[array[i] % chars.length];
    return pass;
  },

  addProtectFiles(files) {
    if (!files.length) return;
    this.protectState.files.push(...Array.from(files));
    
    // update list visually
    const list = document.getElementById('protect-file-list');
    list.innerHTML = '';
    list.classList.remove('hidden');
    
    this.protectState.files.forEach((f, i) => {
      list.innerHTML += `<div class="file-item"><div class="file-item-name">📄 ${f.name}</div><button class="file-item-remove" onclick="App.removeProtectFile(${i})">✕</button></div>`;
    });

    document.getElementById('protect-setup').classList.remove('hidden');
  },

  removeProtectFile(idx) {
    this.protectState.files.splice(idx, 1);
    const list = document.getElementById('protect-file-list');
    if (this.protectState.files.length === 0) {
      list.classList.add('hidden');
      document.getElementById('protect-setup').classList.add('hidden');
    } else {
      list.innerHTML = '';
      this.protectState.files.forEach((f, i) => {
        list.innerHTML += `<div class="file-item"><div class="file-item-name">📄 ${f.name}</div><button class="file-item-remove" onclick="App.removeProtectFile(${i})">✕</button></div>`;
      });
    }
  },

  async startProtect() {
    const pw = document.getElementById('protect-password').value;
    if (!pw) return;

    const ui = {
      progWrap: document.getElementById('protect-progress'),
      progFill: document.getElementById('protect-progress-fill'),
      result: document.getElementById('protect-result'),
      btn: document.getElementById('btn-protect-start')
    };

    ui.btn.disabled = true;
    ui.progWrap.classList.remove('hidden');
    ui.result.classList.add('hidden');

    try {
      // Configuration for AES-256 encryption in zip.js
      const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {
        password: pw,
        encryptionStrength: 3 // 3 = AES-256
      });

      let processed = 0;
      const total = this.protectState.files.length;

      for (let file of this.protectState.files) {
        await zipWriter.add(file.name, new zip.BlobReader(file));
        processed++;
        ui.progFill.style.width = Math.floor((processed/total)*100) + '%';
      }

      this.protectState.blob = await zipWriter.close();
      ui.result.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      alert("Encryption error: " + err.message);
    } finally {
      ui.btn.disabled = false;
      setTimeout(() => ui.progWrap.classList.add('hidden'), 1000);
    }
  },


  // =====================================
  // TAB 4: UNLOCK
  // =====================================
  unlockState: {
    file: null,
    blob: null, // output blob
  },

  initUnlock() {
    const dropzone = document.getElementById('unlock-dropzone');
    const input = document.getElementById('unlock-file-input');
    
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleUnlockFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', e => {
      if(e.target.files.length) this.handleUnlockFile(e.target.files[0]);
    });


    document.getElementById('btn-unlock-clear').addEventListener('click', () => {
      this.unlockState.file = null;
      document.getElementById('unlock-dropzone').classList.remove('hidden');
      document.getElementById('unlock-setup').classList.add('hidden');
      document.getElementById('unlock-result').classList.add('hidden');
      document.getElementById('unlock-error').classList.add('hidden');
    });

    // Method bind
    document.getElementById('unlock-method-manual').addEventListener('click', () => {
      document.getElementById('unlock-method-manual').classList.add('active');
      document.getElementById('unlock-method-auto').classList.remove('active');
      document.getElementById('unlock-panel-manual').classList.remove('hidden');
      document.getElementById('unlock-panel-auto').classList.add('hidden');
    });
    document.getElementById('unlock-method-auto').addEventListener('click', () => {
      document.getElementById('unlock-method-auto').classList.add('active');
      document.getElementById('unlock-method-manual').classList.remove('active');
      document.getElementById('unlock-panel-auto').classList.remove('hidden');
      document.getElementById('unlock-panel-manual').classList.add('hidden');
    });

    // Toggle PW
    document.getElementById('btn-toggle-pw-unlock').addEventListener('click', () => {
      const inp = document.getElementById('unlock-password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      document.getElementById('btn-toggle-pw-unlock').textContent = inp.type === 'password' ? '👁️' : '🙈';
    });

    document.getElementById('unlock-password').addEventListener('input', e => {
      document.getElementById('btn-unlock-start').disabled = e.target.value.length === 0;
    });

    document.getElementById('btn-unlock-start').addEventListener('click', () => this.startUnlockManual());
    document.getElementById('btn-unlock-dict').addEventListener('click', () => this.startUnlockDict());

    document.getElementById('btn-unlock-download').addEventListener('click', () => {
      if(this.unlockState.blob) this.downloadBlob(this.unlockState.blob, 'unlocked_archive.zip');
    });
  },

  handleUnlockFile(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) return alert('Please upload a .zip file');
    this.unlockState.file = file;
    document.getElementById('unlock-file-name').textContent = file.name;
    document.getElementById('unlock-file-size').textContent = this.formatSize(file.size);
    document.getElementById('unlock-dropzone').classList.add('hidden');
    document.getElementById('unlock-setup').classList.remove('hidden');
    document.getElementById('unlock-result').classList.add('hidden');
  },

  async reconstructZipWithoutPassword(password, progressFillEl) {
    // Read original ZIP with password
    const reader = new zip.ZipReader(new zip.BlobReader(this.unlockState.file), { password: password });
    let entries = [];
    try {
      entries = await reader.getEntries();
      // Test the password by trying to read the first encrypted file
      const encryptedEntry = entries.find(e => e.encrypted);
      if (encryptedEntry) {
        // Just read a few bytes to verify MAC/Checksum
        const testWriter = new zip.BlobWriter();
        await encryptedEntry.getData(testWriter, { password: password });
      }
    } catch(err) {
      await reader.close();
      throw err; // Incorrect password throws here
    }

    // If we reach here, password is correct. Now reconstruct.
    const writer = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
    let num = 0;
    const total = entries.length;

    for (let entry of entries) {
      if (entry.directory) {
         await writer.add(entry.filename, null, { directory: true });
      } else {
         const blobwriter = new zip.BlobWriter();
         const data = await entry.getData(blobwriter, { password: password });
         await writer.add(entry.filename, new zip.BlobReader(data));
      }
      num++;
      if (progressFillEl) progressFillEl.style.width = Math.floor((num/total)*100) + '%';
    }

    await reader.close();
    return await writer.close();
  },

  async startUnlockManual() {
    const pw = document.getElementById('unlock-password').value;
    const errBox = document.getElementById('unlock-error');
    errBox.classList.add('hidden');

    document.getElementById('btn-unlock-start').disabled = true;
    document.getElementById('unlock-progress').classList.remove('hidden');
    document.getElementById('unlock-result').classList.add('hidden');
    document.getElementById('unlock-found-pw-wrap').classList.add('hidden');

    try {
      this.unlockState.blob = await this.reconstructZipWithoutPassword(pw, document.getElementById('unlock-progress-fill'));
      document.getElementById('unlock-result').classList.remove('hidden');
    } catch (err) {
      console.error(err);
      errBox.textContent = "Error: Incorrect password or corrupted file.";
      errBox.classList.remove('hidden');
      document.getElementById('unlock-result').classList.remove('hidden'); // Show result box just for error
      document.getElementById('btn-unlock-download').classList.add('hidden');
    } finally {
      document.getElementById('btn-unlock-start').disabled = false;
      document.getElementById('unlock-progress').classList.add('hidden');
    }
  },

  async startUnlockDict() {
    const errBox = document.getElementById('unlock-error');
    errBox.classList.add('hidden');

    document.getElementById('btn-unlock-dict').disabled = true;
    document.getElementById('unlock-progress').classList.add('hidden'); // hidden because we use dict status
    document.getElementById('unlock-result').classList.add('hidden');
    document.getElementById('btn-unlock-download').classList.remove('hidden'); // ensure download is visible later

    const statusEl = document.getElementById('unlock-dict-status');
    statusEl.classList.remove('hidden');
    const prog = document.getElementById('unlock-dict-progress');
    const current = document.getElementById('unlock-dict-current');
    const tried = document.getElementById('unlock-dict-tried');

    let correctPw = null;

    // Dictionary Loop
    for (let i = 0; i < this.DICTIONARY.length; i++) {
      const pw = this.DICTIONARY[i];
      tried.textContent = (i + 1);
      prog.style.width = ((i+1)/this.DICTIONARY.length*100) + '%';
      current.textContent = `Trying: ${pw || '(empty)'}`;

      // Allow UI update
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));

      try {
        const reader = new zip.ZipReader(new zip.BlobReader(this.unlockState.file), { password: pw });
        const entries = await reader.getEntries();
        const encrypted = entries.find(e => e.encrypted);
        if (encrypted) {
           await encrypted.getData(new zip.BlobWriter(), { password: pw });
        }
        await reader.close();
        correctPw = pw;
        break; // Match found!
      } catch (err) {
        // Incorrect password, continue loop
      }
    }

    if (correctPw !== null) {
      current.textContent = "✅ Password Found! Decrypting full archive...";
      try {
        // Reconstruct
        document.getElementById('unlock-progress').classList.remove('hidden');
        this.unlockState.blob = await this.reconstructZipWithoutPassword(correctPw, document.getElementById('unlock-progress-fill'));
        
        document.getElementById('unlock-found-pw').textContent = correctPw || '(empty)';
        document.getElementById('unlock-found-pw-wrap').classList.remove('hidden');
        document.getElementById('unlock-result').classList.remove('hidden');
      } catch (err) {
        errBox.textContent = "Error reconstructing file: " + err.message;
        errBox.classList.remove('hidden');
        document.getElementById('unlock-result').classList.remove('hidden');
        document.getElementById('btn-unlock-download').classList.add('hidden');
      }
    } else {
      errBox.textContent = "Dictionary attack failed. The password is not in our list of common passwords. Try 'Known Password'.";
      errBox.classList.remove('hidden');
      document.getElementById('unlock-result').classList.remove('hidden');
      document.getElementById('btn-unlock-download').classList.add('hidden');
    }

    document.getElementById('btn-unlock-dict').disabled = false;
    document.getElementById('unlock-progress').classList.add('hidden');
  },


  // =====================================
  // UTILS
  // =====================================
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
