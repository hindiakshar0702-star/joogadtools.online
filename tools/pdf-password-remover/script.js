/**
 * PDF Password Tool
 * Unlock (Manual + Dictionary Attack) & Protect (AES-256-GCM)
 */

const App = {
  // ===== COMMON =====
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
    'jan2024','feb2024','mar2024','jan2025','feb2025','mar2025','apr2025',
    'jan2026','feb2026','mar2026','apr2026',
    'summer','winter','spring','monday','friday','sunday',
    'red','blue','green','white','black','yellow','orange','purple',
    'one','two','three','four','five','six','seven','eight','nine','ten',
    'a1b2c3','a1b2c3d4','aa1234','bb1234','cc1234',
    'pdf','pdf123','file','file123','doc','doc123','document',
    'security','secure','private','protect','locked','unlock',
    'owner','creator','author','editor','viewer','reader',
    'p@ssw0rd','P@ssw0rd','p@ss','p@ss123','pa$$word','pa$$w0rd',
    'changeme','temp','temp123','default','default1',
    '102030','112233','121212','131313','141414','252525',
    'aaa111','bbb222','abc111','xyz123','xyz789',
    'super','super123','hero','hero123','power','power123',
    'system','system123','server','server123','network','net123',
    'abcabc','xyzxyz','qweqwe','asdasd',
  ],

  init() {
    this.bindTabs();
    this.bindUnlock();
    this.bindProtect();
  },

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  },

  // ===== TABS =====
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
  // ===== UNLOCK TAB =====
  // =====================================
  unlockFile: null,
  unlockBytes: null,
  unlockedBytes: null,
  unlockedFileName: '',

  bindUnlock() {
    const dropzone = document.getElementById('unlock-dropzone');
    const fileInput = document.getElementById('unlock-file');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleUnlockFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) this.handleUnlockFile(e.target.files[0]);
    });

    document.getElementById('btn-unlock-remove').addEventListener('click', () => this.removeUnlockFile());

    // Password toggle
    document.getElementById('btn-toggle-pw-unlock').addEventListener('click', () => {
      const inp = document.getElementById('unlock-password');
      const isHidden = inp.type === 'password';
      inp.type = isHidden ? 'text' : 'password';
      document.getElementById('btn-toggle-pw-unlock').textContent = isHidden ? '🙈' : '👁️';
    });

    // Method toggle
    document.getElementById('method-manual').addEventListener('click', () => {
      document.getElementById('method-manual').classList.add('active');
      document.getElementById('method-auto').classList.remove('active');
      document.getElementById('panel-manual').classList.remove('hidden');
      document.getElementById('panel-auto').classList.add('hidden');
    });
    document.getElementById('method-auto').addEventListener('click', () => {
      document.getElementById('method-auto').classList.add('active');
      document.getElementById('method-manual').classList.remove('active');
      document.getElementById('panel-auto').classList.remove('hidden');
      document.getElementById('panel-manual').classList.add('hidden');
    });

    // Unlock button
    document.getElementById('btn-unlock').addEventListener('click', () => this.manualUnlock());

    // Dict attack button
    document.getElementById('btn-dict-attack').addEventListener('click', () => this.dictionaryAttack());

    // Download
    document.getElementById('btn-download-unlocked').addEventListener('click', () => this.downloadUnlocked());
  },

  handleUnlockFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) return alert('Please upload a PDF file.');
    this.unlockFile = file;
    document.getElementById('unlock-file-name').textContent = file.name;
    document.getElementById('unlock-file-size').textContent = this.formatSize(file.size);
    const reader = new FileReader();
    reader.onload = e => {
      this.unlockBytes = e.target.result;
      document.getElementById('btn-unlock').disabled = false;
      document.getElementById('btn-dict-attack').disabled = false;
    };
    reader.readAsArrayBuffer(file);
    document.getElementById('unlock-dropzone').classList.add('hidden');
    document.getElementById('unlock-file-info').classList.remove('hidden');
    this.resetUnlockResult();
  },

  removeUnlockFile() {
    this.unlockFile = null; this.unlockBytes = null; this.unlockedBytes = null;
    document.getElementById('unlock-file').value = '';
    document.getElementById('unlock-dropzone').classList.remove('hidden');
    document.getElementById('unlock-file-info').classList.add('hidden');
    document.getElementById('btn-unlock').disabled = true;
    document.getElementById('btn-dict-attack').disabled = true;
    document.getElementById('unlock-password').value = '';
    this.resetUnlockResult();
  },

  resetUnlockResult() {
    document.getElementById('unlock-result-empty').classList.remove('hidden');
    document.getElementById('unlock-result-success').classList.add('hidden');
    document.getElementById('unlock-result-error').classList.add('hidden');
    document.getElementById('unlock-progress').classList.add('hidden');
    document.getElementById('dict-status').classList.add('hidden');
    document.getElementById('found-password-wrap').classList.add('hidden');
  },

  async tryLoadPdf(password) {
    const { PDFDocument } = PDFLib;
    try {
      const doc = await PDFDocument.load(this.unlockBytes, { password, ignoreEncryption: false });
      return doc;
    } catch {
      if (!password) {
        try {
          const doc = await PDFDocument.load(this.unlockBytes, { ignoreEncryption: true });
          return doc;
        } catch { return null; }
      }
      return null;
    }
  },

  async savePdfUnlocked(pdfDoc) {
    const { PDFDocument } = PDFLib;
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    pages.forEach(p => newPdf.addPage(p));
    const title = pdfDoc.getTitle(); if (title) newPdf.setTitle(title);
    const author = pdfDoc.getAuthor(); if (author) newPdf.setAuthor(author);
    return await newPdf.save();
  },

  async manualUnlock() {
    if (!this.unlockBytes) return;
    const btn = document.getElementById('btn-unlock');
    btn.disabled = true; btn.innerHTML = '⏳ Processing...';
    this.resetUnlockResult();
    document.getElementById('unlock-result-empty').classList.add('hidden');

    const pw = document.getElementById('unlock-password').value;
    try {
      const doc = await this.tryLoadPdf(pw);
      if (!doc) throw new Error(pw ? 'Incorrect password. Please try again.' : 'This PDF requires a password. Please enter it or try Dictionary Attack.');
      const bytes = await this.savePdfUnlocked(doc);
      this.showUnlockSuccess(bytes, null);
    } catch (err) {
      document.getElementById('unlock-error-msg').textContent = err.message;
      document.getElementById('unlock-result-error').classList.remove('hidden');
    } finally {
      btn.disabled = false; btn.innerHTML = '🔓 Unlock & Remove Password';
    }
  },

  async dictionaryAttack() {
    if (!this.unlockBytes) return;
    const btn = document.getElementById('btn-dict-attack');
    btn.disabled = true; btn.innerHTML = '⏳ Attacking...';
    this.resetUnlockResult();
    document.getElementById('unlock-result-empty').classList.add('hidden');

    const statusEl = document.getElementById('dict-status');
    const progressFill = document.getElementById('dict-progress-fill');
    const triedEl = document.getElementById('dict-tried');
    const totalEl = document.getElementById('dict-total');
    const currentEl = document.getElementById('dict-current');

    statusEl.classList.remove('hidden');
    totalEl.textContent = this.DICTIONARY.length;

    let found = false;
    for (let i = 0; i < this.DICTIONARY.length; i++) {
      const pw = this.DICTIONARY[i];
      triedEl.textContent = i + 1;
      currentEl.textContent = 'Trying: ' + (pw || '(empty)');
      progressFill.style.width = ((i + 1) / this.DICTIONARY.length * 100) + '%';

      // Yield every 5 attempts
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));

      const doc = await this.tryLoadPdf(pw);
      if (doc) {
        found = true;
        currentEl.textContent = '✅ Password Found!';
        const bytes = await this.savePdfUnlocked(doc);
        this.showUnlockSuccess(bytes, pw);
        break;
      }
    }

    if (!found) {
      currentEl.textContent = '❌ No match found';
      document.getElementById('unlock-error-msg').textContent = 'Dictionary attack failed. The password is not in our common passwords list. Try entering the password manually.';
      document.getElementById('unlock-result-error').classList.remove('hidden');
    }

    btn.disabled = false; btn.innerHTML = '🎯 Start Dictionary Attack';
  },

  showUnlockSuccess(bytes, foundPw) {
    this.unlockedBytes = bytes;
    this.unlockedFileName = this.unlockFile.name.replace(/\.pdf$/i, '') + '_unlocked.pdf';
    document.getElementById('meta-original').textContent = this.formatSize(this.unlockBytes.byteLength);
    document.getElementById('meta-unlocked').textContent = this.formatSize(bytes.length);
    // Try to get page count from bytes
    try {
      const text = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 50000)));
      const match = text.match(/\/Type\s*\/Page[^s]/g);
      document.getElementById('meta-pages').textContent = match ? match.length : '—';
    } catch { document.getElementById('meta-pages').textContent = '—'; }

    if (foundPw !== null && foundPw !== undefined) {
      document.getElementById('found-password-wrap').classList.remove('hidden');
      document.getElementById('found-password').textContent = foundPw || '(empty/no password)';
    }
    document.getElementById('unlock-result-success').classList.remove('hidden');
    document.getElementById('unlock-result-error').classList.add('hidden');
  },

  downloadUnlocked() {
    if (!this.unlockedBytes) return;
    const blob = new Blob([this.unlockedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = this.unlockedFileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  },

  // =====================================
  // ===== PROTECT TAB =====
  // =====================================
  protectFile: null,
  protectBytes: null,
  protectedBlob: null,
  protectedFileName: '',

  bindProtect() {
    const dropzone = document.getElementById('protect-dropzone');
    const fileInput = document.getElementById('protect-file');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault(); dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleProtectFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files.length) this.handleProtectFile(e.target.files[0]);
    });

    document.getElementById('btn-protect-remove').addEventListener('click', () => this.removeProtectFile());

    // Password toggle
    document.getElementById('btn-toggle-pw-protect').addEventListener('click', () => {
      const inp = document.getElementById('protect-password');
      const isHidden = inp.type === 'password';
      inp.type = isHidden ? 'text' : 'password';
      document.getElementById('protect-password-confirm').type = isHidden ? 'text' : 'password';
      document.getElementById('btn-toggle-pw-protect').textContent = isHidden ? '🙈' : '👁️';
    });

    // Password generator
    document.getElementById('btn-gen-password').addEventListener('click', () => this.generatePassword());
    document.getElementById('btn-use-password').addEventListener('click', () => {
      const pw = document.getElementById('generated-pw').textContent;
      document.getElementById('protect-password').value = pw;
      document.getElementById('protect-password-confirm').value = pw;
      document.getElementById('protect-password').type = 'text';
      document.getElementById('protect-password-confirm').type = 'text';
      this.checkProtectReady();
    });
    document.getElementById('pw-length').addEventListener('input', e => {
      document.getElementById('pw-length-val').textContent = e.target.value;
    });

    // Enable/disable protect button
    ['protect-password', 'protect-password-confirm'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.checkProtectReady());
    });

    // Protect button
    document.getElementById('btn-protect').addEventListener('click', () => this.protectPdf());

    // Download
    document.getElementById('btn-download-protected').addEventListener('click', () => this.downloadProtected());
  },

  handleProtectFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) return alert('Please upload a PDF file.');
    this.protectFile = file;
    document.getElementById('protect-file-name').textContent = file.name;
    document.getElementById('protect-file-size').textContent = this.formatSize(file.size);
    const reader = new FileReader();
    reader.onload = e => {
      this.protectBytes = new Uint8Array(e.target.result);
      this.checkProtectReady();
    };
    reader.readAsArrayBuffer(file);
    document.getElementById('protect-dropzone').classList.add('hidden');
    document.getElementById('protect-file-info').classList.remove('hidden');
    this.resetProtectResult();
  },

  removeProtectFile() {
    this.protectFile = null; this.protectBytes = null; this.protectedBlob = null;
    document.getElementById('protect-file').value = '';
    document.getElementById('protect-dropzone').classList.remove('hidden');
    document.getElementById('protect-file-info').classList.add('hidden');
    document.getElementById('btn-protect').disabled = true;
    this.resetProtectResult();
  },

  resetProtectResult() {
    document.getElementById('protect-result-empty').classList.remove('hidden');
    document.getElementById('protect-result-success').classList.add('hidden');
    document.getElementById('protect-result-error').classList.add('hidden');
    document.getElementById('protect-progress').classList.add('hidden');
  },

  checkProtectReady() {
    const pw = document.getElementById('protect-password').value;
    const pwc = document.getElementById('protect-password-confirm').value;
    document.getElementById('btn-protect').disabled = !(this.protectBytes && pw.length >= 1 && pw === pwc);
  },

  generatePassword() {
    const len = parseInt(document.getElementById('pw-length').value);
    let chars = '';
    if (document.getElementById('pw-upper').checked) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (document.getElementById('pw-lower').checked) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (document.getElementById('pw-numbers').checked) chars += '0123456789';
    if (document.getElementById('pw-symbols').checked) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    const array = new Uint32Array(len);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < len; i++) result += chars[array[i] % chars.length];

    document.getElementById('generated-pw').textContent = result;
    document.getElementById('pw-gen-output').classList.remove('hidden');
  },

  async protectPdf() {
    if (!this.protectBytes) return;
    const pw = document.getElementById('protect-password').value;
    const pwc = document.getElementById('protect-password-confirm').value;
    if (pw !== pwc) return alert('Passwords do not match!');
    if (pw.length < 1) return alert('Password cannot be empty!');

    const btn = document.getElementById('btn-protect');
    btn.disabled = true; btn.innerHTML = '⏳ Encrypting...';
    this.resetProtectResult();
    document.getElementById('protect-result-empty').classList.add('hidden');

    const progressWrap = document.getElementById('protect-progress');
    const progressFill = document.getElementById('protect-progress-fill');
    const progressText = document.getElementById('protect-progress-text');
    progressWrap.classList.remove('hidden');
    progressFill.style.width = '20%';
    progressText.textContent = 'Deriving encryption key...';

    await new Promise(r => setTimeout(r, 100));

    try {
      // Derive key from password using PBKDF2
      const enc = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      progressFill.style.width = '50%';
      progressText.textContent = 'Encrypting PDF data...';
      await new Promise(r => setTimeout(r, 100));

      // Encrypt
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, this.protectBytes);

      progressFill.style.width = '80%';
      progressText.textContent = 'Packaging encrypted file...';
      await new Promise(r => setTimeout(r, 100));

      // Create package: MAGIC(8) + SALT(16) + IV(12) + ENCRYPTED_DATA
      const magic = enc.encode('JTPDFENC'); // 8 bytes magic header
      const output = new Uint8Array(8 + 16 + 12 + encrypted.byteLength);
      output.set(magic, 0);
      output.set(salt, 8);
      output.set(iv, 24);
      output.set(new Uint8Array(encrypted), 36);

      this.protectedBlob = new Blob([output], { type: 'application/octet-stream' });
      this.protectedFileName = this.protectFile.name.replace(/\.pdf$/i, '') + '_protected.pdf.enc';

      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';

      document.getElementById('protect-meta-original').textContent = this.formatSize(this.protectBytes.length);
      document.getElementById('protect-meta-encrypted').textContent = this.formatSize(output.length);
      document.getElementById('protect-result-success').classList.remove('hidden');

      setTimeout(() => progressWrap.classList.add('hidden'), 1500);

    } catch (err) {
      console.error(err);
      document.getElementById('protect-error-msg').textContent = err.message || 'Encryption failed.';
      document.getElementById('protect-result-error').classList.remove('hidden');
    } finally {
      btn.disabled = false; btn.innerHTML = '🔒 Protect PDF with Password';
    }
  },

  downloadProtected() {
    if (!this.protectedBlob) return;
    const url = URL.createObjectURL(this.protectedBlob);
    const a = document.createElement('a'); a.href = url; a.download = this.protectedFileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
