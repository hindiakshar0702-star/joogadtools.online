/* =============================
   SECRET STUDIO — script.js
   AES-256 Encryption + LSB Steganography
   100% Client-Side, Zero Server
   ============================= */

(function () {
  'use strict';

  // -------- UTILITY FUNCTIONS --------

  function showToast(msg, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
  }

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
      showToast('✅ Copied to clipboard');
    });
  }

  // -------- TABS --------

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Sub-tabs (scoped to parent panel)
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.tab-panel');
      panel.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      panel.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.sub).classList.add('active');
    });
  });

  // -------- PASSWORD TOGGLES --------
  document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈' : '👁️';
    });
  });

  // -------- MESSAGE MASK TOGGLES --------
  // -webkit-text-security works in Chrome/Edge/Safari.
  // For Firefox fallback we track real value separately.
  function setupMaskToggle(btnId, textareaId) {
    const btn = document.getElementById(btnId);
    const ta = document.getElementById(textareaId);
    if (!btn || !ta) return;

    // Check if -webkit-text-security works
    const supportsWebkit = CSS.supports('-webkit-text-security', 'disc');
    let realValue = '';
    let isRevealed = false;

    if (!supportsWebkit) {
      // Firefox: intercept typing, store real value, display bullets
      ta.addEventListener('input', () => {
        if (isRevealed) { realValue = ta.value; return; }
        // Calculate what changed
        const displayed = ta.value;
        const bulletLen = realValue.length;
        // Simple approach: rebuild from scratch using selection
        realValue = displayed.replace(/•/g, (_, i) => realValue[i] || '');
        // For new chars: anything that isn't • is a new real char
        const newReal = [];
        let ri = 0;
        for (let i = 0; i < displayed.length; i++) {
          if (displayed[i] === '•') { newReal.push(realValue[ri] || '•'); ri++; }
          else { newReal.push(displayed[i]); ri++; }
        }
        realValue = newReal.join('');
        // Redisplay as bullets
        const caretPos = ta.selectionStart;
        ta.value = '•'.repeat(displayed.length);
        ta.setSelectionRange(caretPos, caretPos);
      });
    }

    btn.addEventListener('click', () => {
      isRevealed = !isRevealed;

      if (supportsWebkit) {
        ta.classList.toggle('revealed', isRevealed);
      } else {
        if (isRevealed) { ta.value = realValue; }
        else { realValue = ta.value; ta.value = '•'.repeat(realValue.length); }
      }

      // Helper to get real value for encryption
      ta._getRealValue = () => supportsWebkit ? ta.value : realValue;

      btn.textContent = isRevealed ? '🙈 Hide' : '👁️ Show';
    });

    // Expose real value getter
    ta._getRealValue = () => supportsWebkit ? ta.value : realValue;
  }

  setupMaskToggle('toggle-encrypt-msg', 'encrypt-input');
  setupMaskToggle('toggle-hide-msg', 'hide-message');

  // -------- PASSWORD STRENGTH --------
  function checkStrength(password, fillId, labelId) {
    const fill = document.getElementById(fillId);
    const label = document.getElementById(labelId);
    if (!password) {
      fill.style.width = '0%';
      fill.style.background = '';
      label.textContent = '—';
      label.style.color = '';
      return;
    }
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { w: '20%', color: '#ef4444', text: 'Very Weak' },
      { w: '40%', color: '#f97316', text: 'Weak' },
      { w: '60%', color: '#f59e0b', text: 'Fair' },
      { w: '80%', color: '#22c55e', text: 'Strong' },
      { w: '100%', color: '#6ee7b7', text: '💪 Excellent' },
    ];
    const lvl = levels[Math.min(score, 4)];
    fill.style.width = lvl.w;
    fill.style.background = lvl.color;
    label.textContent = lvl.text;
    label.style.color = lvl.color;
  }

  document.getElementById('encrypt-password').addEventListener('input', (e) => {
    checkStrength(e.target.value, 'encrypt-strength-fill', 'encrypt-strength-label');
  });

  // -------- TOOL 1A: AES ENCRYPT --------

  const encryptInput = document.getElementById('encrypt-input');
  const encryptCharCount = document.getElementById('encrypt-char-count');

  encryptInput.addEventListener('input', () => {
    const len = encryptInput.value.length;
    encryptCharCount.textContent = `${len.toLocaleString()} character${len !== 1 ? 's' : ''}`;
  });

  document.getElementById('btn-encrypt').addEventListener('click', () => {
    const message = (encryptInput._getRealValue ? encryptInput._getRealValue() : encryptInput.value).trim();
    const password = document.getElementById('encrypt-password').value;

    if (!message) return showToast('⚠️ Please enter a message to encrypt.');
    if (!password) return showToast('⚠️ Please enter a password.');

    try {
      const cipher = CryptoJS.AES.encrypt(message, password).toString();
      document.getElementById('encrypt-output').textContent = cipher;
      document.getElementById('encrypt-output-wrap').classList.remove('hidden');
      showToast('🔒 Message encrypted with AES-256!');
    } catch (e) {
      showToast('❌ Encryption failed.');
    }
  });

  document.getElementById('btn-copy-cipher').addEventListener('click', () => {
    copyText(document.getElementById('encrypt-output').textContent,
             document.getElementById('btn-copy-cipher'));
  });

  // -------- TOOL 1B: AES DECRYPT --------

  document.getElementById('btn-decrypt').addEventListener('click', () => {
    const cipher = document.getElementById('decrypt-input').value.trim();
    const password = document.getElementById('decrypt-password').value;
    const outputWrap = document.getElementById('decrypt-output-wrap');
    const errorBox = document.getElementById('decrypt-error');
    const outputPre = document.getElementById('decrypt-output');

    outputWrap.classList.add('hidden');
    errorBox.classList.add('hidden');

    if (!cipher) return showToast('⚠️ Please paste the ciphertext.');
    if (!password) return showToast('⚠️ Please enter the password.');

    try {
      const bytes = CryptoJS.AES.decrypt(cipher, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error('Empty result — wrong password');

      outputPre.textContent = decrypted;
      outputWrap.classList.remove('hidden');
      showToast('🔓 Decrypted successfully!');
    } catch {
      errorBox.classList.remove('hidden');
    }
  });

  document.getElementById('btn-copy-decrypted').addEventListener('click', () => {
    copyText(document.getElementById('decrypt-output').textContent,
             document.getElementById('btn-copy-decrypted'));
  });

  // -------- TOOL 2: STEGANOGRAPHY --------

  // LSB Encoding constants
  const HEADER_MARKER = 'SSEC'; // 4-byte magic header
  const BITS_PER_CHANNEL = 2;   // Use 2 LSBs per colour channel (R,G,B) = 6 bits per pixel
  const CHANNELS = 3;           // R, G, B

  function textToBytes(text) {
    return new TextEncoder().encode(text);
  }

  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function imageCapacityBytes(pixelCount) {
    // 2 LSBs × 3 channels = 6 bits/pixel. 6 bits/pixel => 6/8 bytes/pixel
    return Math.floor(pixelCount * BITS_PER_CHANNEL * CHANNELS / 8);
  }

  // Encode bytes into image pixels using BITS_PER_CHANNEL LSBs per channel
  function encodePixels(data, imageData) {
    const pixels = imageData.data; // RGBA array

    // FIX: Force every pixel fully opaque BEFORE encoding.
    // Premultiplied-alpha round-trips corrupt LSBs on semi-transparent pixels.
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

    const allBits = [];

    for (const byte of data) {
      for (let b = 7; b >= 0; b--) {
        allBits.push((byte >> b) & 1);
      }
    }

    let bitIndex = 0;
    let pixelIndex = 0;

    while (bitIndex < allBits.length) {
      const baseIdx = pixelIndex * 4; // RGBA offset
      for (let ch = 0; ch < CHANNELS; ch++) {
        for (let bit = BITS_PER_CHANNEL - 1; bit >= 0; bit--) {
          if (bitIndex >= allBits.length) break;
          const mask = ~(1 << bit) & 0xFF;
          pixels[baseIdx + ch] = (pixels[baseIdx + ch] & mask) | (allBits[bitIndex] << bit);
          bitIndex++;
        }
      }
      pixelIndex++;
    }
    return imageData;
  }

  // Decode bytes from image pixels
  function decodePixels(imageData, byteCount) {
    const pixels = imageData.data;
    const bits = [];
    let pixelIndex = 0;

    const totalBits = byteCount * 8;

    while (bits.length < totalBits) {
      const baseIdx = pixelIndex * 4;
      for (let ch = 0; ch < CHANNELS; ch++) {
        for (let bit = BITS_PER_CHANNEL - 1; bit >= 0; bit--) {
          if (bits.length >= totalBits) break;
          bits.push((pixels[baseIdx + ch] >> bit) & 1);
        }
      }
      pixelIndex++;
    }

    const bytes = [];
    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        byte = (byte << 1) | bits[i * 8 + b];
      }
      bytes.push(byte);
    }
    return new Uint8Array(bytes);
  }

  // Build payload: [MARKER(4)] + [LENGTH(4 bytes big-endian)] + [DATA...]
  function buildPayload(cipherBytes) {
    const marker = new TextEncoder().encode(HEADER_MARKER); // 4 bytes
    const len = cipherBytes.length;
    const lenBytes = new Uint8Array(4);
    lenBytes[0] = (len >> 24) & 0xFF;
    lenBytes[1] = (len >> 16) & 0xFF;
    lenBytes[2] = (len >> 8) & 0xFF;
    lenBytes[3] = len & 0xFF;

    const payload = new Uint8Array(4 + 4 + len);
    payload.set(marker, 0);
    payload.set(lenBytes, 4);
    payload.set(cipherBytes, 8);
    return payload;
  }

  // Parse payload: verify marker, read length, extract data
  function parsePayload(rawBytes) {
    const marker = bytesToText(rawBytes.slice(0, 4));
    if (marker !== HEADER_MARKER) throw new Error('No Secret Studio marker found. Wrong image?');
    const len = (rawBytes[4] << 24) | (rawBytes[5] << 16) | (rawBytes[6] << 8) | rawBytes[7];
    if (len <= 0 || len > rawBytes.length - 8) throw new Error('Invalid data length in header.');
    return rawBytes.slice(8, 8 + len);
  }

  // ---- Hide Panel ----

  let hideImageData = null;
  let hideCanvas = document.getElementById('hide-canvas');

  function setupDropzone(dropzoneId, fileInputId, onFile) {
    const dz = document.getElementById(dropzoneId);
    const fi = document.getElementById(fileInputId);
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener('change', e => { if (e.target.files[0]) onFile(e.target.files[0]); });
  }

  // FIX: Use createImageBitmap with colorSpaceConversion:'none' to prevent
  // browser color-management changing pixel values during drawImage.
  function loadImageToCanvas(canvas, file) {
    return new Promise((resolve, reject) => {
      const tryBitmap = () => {
        createImageBitmap(file, { colorSpaceConversion: 'none' })
          .then(bitmap => {
            canvas.width  = bitmap.width;
            canvas.height = bitmap.height;
            canvas.getContext('2d').drawImage(bitmap, 0, 0);
            bitmap.close();
            resolve({ w: canvas.width, h: canvas.height });
          })
          .catch(() => {
            // Fallback: FileReader + Image
            const reader = new FileReader();
            reader.onload = e => {
              const img = new Image();
              img.onload = () => {
                canvas.width  = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve({ w: img.width, h: img.height });
              };
              img.onerror = reject;
              img.src = e.target.result;
            };
            reader.readAsDataURL(file);
          });
      };
      tryBitmap();
    });
  }

  setupDropzone('hide-dropzone', 'hide-file', (file) => {
    const previewWrap = document.getElementById('hide-preview-wrap');
    const previewImg  = document.getElementById('hide-preview-img');

    loadImageToCanvas(hideCanvas, file).then(({ w, h }) => {
      const ctx = hideCanvas.getContext('2d');
      hideImageData = ctx.getImageData(0, 0, w, h);

      const capacityBytes = imageCapacityBytes(w * h) - 8;
      document.getElementById('hide-capacity').textContent =
        capacityBytes > 0 ? `~${(capacityBytes / 1024).toFixed(1)} KB` : 'Too small!';
      document.getElementById('hide-img-size').textContent = `${w} × ${h} px`;

      // Also render preview via FileReader URL
      const previewReader = new FileReader();
      previewReader.onload = e => { previewImg.src = e.target.result; };
      previewReader.readAsDataURL(file);

      previewWrap.classList.remove('hidden');
      document.getElementById('hide-output-wrap').classList.add('hidden');
    }).catch(() => showToast('❌ Could not load image.'));
  });

  const hideMsgInput = document.getElementById('hide-message');
  hideMsgInput.addEventListener('input', () => {
    const el = hideMsgInput;
    const val = el._getRealValue ? el._getRealValue() : el.value;
    const bytes = new TextEncoder().encode(val).length;
    document.getElementById('hide-msg-size').textContent =
      `${bytes} bytes needed (+ header)`;
  });

  document.getElementById('btn-hide').addEventListener('click', () => {
    if (!hideImageData) return showToast('⚠️ Please upload a carrier image first.');
    const hideMsgEl = document.getElementById('hide-message');
    const message = (hideMsgEl._getRealValue ? hideMsgEl._getRealValue() : hideMsgEl.value).trim();
    if (!message) return showToast('⚠️ Please enter a secret message.');
    const password = document.getElementById('hide-password').value;
    if (!password) return showToast('⚠️ Please enter a password.');

    const cipherText = CryptoJS.AES.encrypt(message, password).toString();
    const cipherBytes = new TextEncoder().encode(cipherText);

    const payload = buildPayload(cipherBytes);
    const pixelCount = hideImageData.width * hideImageData.height;
    const capacityBytes = imageCapacityBytes(pixelCount);

    if (payload.length > capacityBytes) {
      return showToast(`❌ Image too small! Needs ${payload.length} bytes, has ${capacityBytes}.`);
    }

    // Encode in chunks with progress
    const progressWrap = document.getElementById('hide-progress-wrap');
    const progressFill = document.getElementById('hide-progress-fill');
    const progressLabel = document.getElementById('hide-progress-label');

    progressWrap.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressLabel.textContent = 'Encrypting & encoding pixels...';

    // Use setTimeout to allow UI to re-render first
    setTimeout(() => {
      const modified = encodePixels(payload, hideImageData);
      hideCanvas.getContext('2d').putImageData(modified, 0, 0);

      progressFill.style.width = '100%';
      progressLabel.textContent = '✅ Encoding complete!';

      setTimeout(() => progressWrap.classList.add('hidden'), 1000);

      document.getElementById('hide-output-wrap').classList.remove('hidden');
      showToast('🎉 Message hidden in image!');
    }, 80);
  });

  document.getElementById('btn-download-steg').addEventListener('click', () => {
    hideCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secret_encoded_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // FIX: Revoke after a safe delay, not synchronously
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  });

  // ---- Extract Panel ----

  let extractImageData = null;
  const extractCanvas = document.createElement('canvas');

  setupDropzone('extract-dropzone', 'extract-file', (file) => {
    // Warn immediately if not PNG
    if (file.type !== 'image/png') {
      document.getElementById('extract-error').textContent =
        '⚠️ Only PNG files are supported. JPEG/WebP compression destroys the hidden data. Upload the exact .png you downloaded.';
      document.getElementById('extract-error').classList.remove('hidden');
    } else {
      document.getElementById('extract-error').classList.add('hidden');
    }
    const previewWrap = document.getElementById('extract-preview-wrap');
    const previewImg  = document.getElementById('extract-preview-img');

    loadImageToCanvas(extractCanvas, file).then(({ w, h }) => {
      extractImageData = extractCanvas.getContext('2d').getImageData(0, 0, w, h);

      const previewReader = new FileReader();
      previewReader.onload = e => { previewImg.src = e.target.result; };
      previewReader.readAsDataURL(file);

      previewWrap.classList.remove('hidden');
      document.getElementById('extract-output-wrap').classList.add('hidden');
      if (file.type === 'image/png') document.getElementById('extract-error').classList.add('hidden');
    }).catch(() => showToast('❌ Could not load image.'));
  }); // ← setupDropzone callback correctly closed here

  document.getElementById('btn-extract').addEventListener('click', () => {
    const outputWrap = document.getElementById('extract-output-wrap');
    const errorBox = document.getElementById('extract-error');

    outputWrap.classList.add('hidden');
    errorBox.classList.add('hidden');

    if (!extractImageData) return showToast('⚠️ Please upload an encoded image first.');
    const password = document.getElementById('extract-password').value;
    if (!password) return showToast('⚠️ Please enter the password.');

    try {
      // Read the header first: 8 bytes (4 marker + 4 length)
      const headerBytes = decodePixels(extractImageData, 8);
      const marker = bytesToText(headerBytes.slice(0, 4));

      if (marker !== HEADER_MARKER) {
        throw new Error(
          `Unrecognised header (got: "${marker}"). This image was not encoded by Secret Studio — or it was re-compressed after encoding (e.g. saved as JPEG or shared via WhatsApp). Please use the original PNG downloaded from the Hide tab.`
        );
      }

      // Use unsigned right shift (>>>) to avoid negative length from bit 31
      const len = ((headerBytes[4] << 24) | (headerBytes[5] << 16) | (headerBytes[6] << 8) | headerBytes[7]) >>> 0;
      if (len === 0 || len > imageCapacityBytes(extractImageData.width * extractImageData.height) - 8) {
        throw new Error('Corrupted data length in the header. Make sure you uploaded the exact PNG file without any modifications.');
      }

      // Now read full payload
      const fullRawBytes = decodePixels(extractImageData, 8 + len);
      const cipherBytes = fullRawBytes.slice(8, 8 + len);
      const cipherText = bytesToText(cipherBytes);

      const decrypted = CryptoJS.AES.decrypt(cipherText, password);
      const plainText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!plainText) throw new Error('Wrong password or corrupted data. Could not decrypt.');

      document.getElementById('extract-output').textContent = plainText;
      outputWrap.classList.remove('hidden');
      showToast('✅ Hidden message extracted & decrypted!');
    } catch (err) {
      errorBox.textContent = `❌ ${err.message}`;
      errorBox.classList.remove('hidden');
    }
  });

  document.getElementById('btn-copy-extracted').addEventListener('click', () => {
    copyText(document.getElementById('extract-output').textContent,
             document.getElementById('btn-copy-extracted'));
  });

  // ==============================
  // TOOL 3: PASSWORD GENERATOR
  // ==============================

  const PG = {
    UPPER:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    LOWER:   'abcdefghijklmnopqrstuvwxyz',
    NUMBERS: '0123456789',
    SYMBOLS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    salt: Math.random().toString(36).slice(2),
    history: [],

    getCharset() {
      let cs = '';
      if (document.getElementById('pg-upper').checked)   cs += this.UPPER;
      if (document.getElementById('pg-lower').checked)   cs += this.LOWER;
      if (document.getElementById('pg-numbers').checked) cs += this.NUMBERS;
      if (document.getElementById('pg-symbols').checked) cs += this.SYMBOLS;
      return cs || this.LOWER; // fallback
    },

    generate() {
      const phrase = document.getElementById('pg-phrase').value;
      const length = parseInt(document.getElementById('pg-length').value);

      // Deterministic hash from phrase + salt
      const seed = CryptoJS.SHA256(phrase + this.salt).toString();

      const charset = this.getCharset();
      
      // Map hex chars to charset indices
      let base = '';
      for (let i = 0; i < seed.length; i++) {
        const val = parseInt(seed[i], 16);
        base += charset[val % charset.length];
      }

      // Extend if needed using cascaded hashes
      let extended = base;
      while (extended.length < length) {
        extended += CryptoJS.SHA256(extended + seed).toString()
          .split('').map(c => charset[parseInt(c, 16) % charset.length]).join('');
      }
      let password = extended.slice(0, length).split('');

      // Guarantee at least one char from each checked category
      const injections = [];
      if (document.getElementById('pg-upper').checked)   injections.push([this.UPPER,   0]);
      if (document.getElementById('pg-lower').checked)   injections.push([this.LOWER,   1]);
      if (document.getElementById('pg-numbers').checked) injections.push([this.NUMBERS, 2]);
      if (document.getElementById('pg-symbols').checked) injections.push([this.SYMBOLS, 3]);

      injections.forEach(([chars, pos]) => {
        const hashVal = parseInt(seed.slice(pos * 4, pos * 4 + 4), 16);
        const injectChar = chars[hashVal % chars.length];
        const replaceAt = (hashVal * 7 + pos * 11) % length;
        password[replaceAt] = injectChar;
      });

      return password.join('');
    },

    updateUI(pw) {
      const out = document.getElementById('pg-output');
      out.textContent = pw || '—';

      // Animate flash
      out.style.opacity = '0';
      setTimeout(() => { out.style.opacity = '1'; }, 80);

      // Strength
      this.renderStrength(pw);
      this.renderStats(pw);
    },

    renderStrength(pw) {
      const fill  = document.getElementById('pg-strength-fill');
      const label = document.getElementById('pg-strength-label');
      if (!pw) { fill.style.width = '0%'; label.textContent = '—'; return; }

      let score = 0;
      if (pw.length >= 12) score++;
      if (pw.length >= 20) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;

      const levels = [
        { w: '20%', color: '#ef4444', text: 'Very Weak' },
        { w: '40%', color: '#f97316', text: 'Weak' },
        { w: '60%', color: '#f59e0b', text: 'Fair' },
        { w: '80%', color: '#22c55e', text: 'Strong' },
        { w: '100%', color: '#6ee7b7', text: '💪 Excellent' },
      ];
      const lvl = levels[Math.min(score, 4)];
      fill.style.width = lvl.w;
      fill.style.background = lvl.color;
      label.textContent = lvl.text;
      label.style.color = lvl.color;
    },

    renderStats(pw) {
      const stats = document.getElementById('pg-stats');
      if (!pw) { stats.innerHTML = ''; return; }
      const upper   = (pw.match(/[A-Z]/g) || []).length;
      const lower   = (pw.match(/[a-z]/g) || []).length;
      const numbers = (pw.match(/[0-9]/g) || []).length;
      const symbols = pw.length - upper - lower - numbers;
      stats.innerHTML = [
        upper   ? `<span class="pg-stat-badge">A–Z: ${upper}</span>`   : '',
        lower   ? `<span class="pg-stat-badge">a–z: ${lower}</span>`   : '',
        numbers ? `<span class="pg-stat-badge">0–9: ${numbers}</span>` : '',
        symbols > 0 ? `<span class="pg-stat-badge">!@#: ${symbols}</span>` : '',
        `<span class="pg-stat-badge">Length: ${pw.length}</span>`,
      ].join('');
    },

    addToHistory(pw) {
      if (!pw || this.history.includes(pw)) return;
      this.history.unshift(pw);
      if (this.history.length > 8) this.history.pop();
      this.renderHistory();
    },

    renderHistory() {
      const container = document.getElementById('pg-history');
      if (!this.history.length) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">No passwords generated yet.</p>';
        return;
      }
      container.innerHTML = this.history.map(pw => `
        <div class="pg-history-item">
          <span class="pg-history-pw">${pw}</span>
          <button class="pg-history-copy" onclick="navigator.clipboard.writeText('${pw.replace(/'/g, "\\'")}')">Copy</button>
        </div>
      `).join('');
    }
  };

  // Trigger generation on any input change
  function runGenerate() {
    const phrase = document.getElementById('pg-phrase').value;
    if (!phrase.trim()) { PG.updateUI(''); return; }
    const pw = PG.generate();
    PG.updateUI(pw);
    return pw;
  }

  document.getElementById('pg-phrase').addEventListener('input', runGenerate);
  document.getElementById('pg-length').addEventListener('input', () => {
    document.getElementById('pg-len-display').textContent =
      document.getElementById('pg-length').value;
    runGenerate();
  });
  ['pg-upper','pg-lower','pg-numbers','pg-symbols'].forEach(id => {
    document.getElementById(id).addEventListener('change', runGenerate);
  });

  // Regenerate with new salt
  document.getElementById('btn-pg-refresh').addEventListener('click', () => {
    PG.salt = Math.random().toString(36).slice(2) + Date.now();
    const pw = runGenerate();
    if (pw) { PG.addToHistory(pw); showToast('🔄 New password generated!'); }
  });

  // Copy generated password
  document.getElementById('btn-copy-pg').addEventListener('click', () => {
    const pw = document.getElementById('pg-output').textContent;
    if (pw && pw !== '—') {
      PG.addToHistory(pw);
      copyText(pw, document.getElementById('btn-copy-pg'));
    }
  });

  // Click output box also copies
  document.getElementById('pg-output-box').addEventListener('click', () => {
    const pw = document.getElementById('pg-output').textContent;
    if (pw && pw !== '—') {
      PG.addToHistory(pw);
      navigator.clipboard.writeText(pw).then(() => showToast('✅ Password copied!'));
    }
  });

  // Clear history
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    PG.history = [];
    PG.renderHistory();
    showToast('History cleared');
  });

  // ---- PG: Use Generated Password shortcut ----
  function getCurrentGeneratedPW() {
    const pw = document.getElementById('pg-output').textContent;
    return (pw && pw !== '—') ? pw : '';
  }

  document.getElementById('btn-use-generated-pw').addEventListener('click', () => {
    const pw = getCurrentGeneratedPW();
    if (!pw) return showToast('⚠️ Generate a password first from the Generate tab.');
    document.getElementById('pg-enc-password').value = pw;
    showToast('✅ Password copied to field!');
  });

  document.getElementById('btn-use-generated-pw-dec').addEventListener('click', () => {
    const pw = getCurrentGeneratedPW();
    if (!pw) return showToast('⚠️ Generate a password first from the Generate tab.');
    document.getElementById('pg-dec-password').value = pw;
    showToast('✅ Password copied to field!');
  });

  // ---- PG: Encrypt with PW ----
  document.getElementById('btn-pg-encrypt').addEventListener('click', () => {
    const message = document.getElementById('pg-enc-input').value.trim();
    const password = document.getElementById('pg-enc-password').value.trim();
    const outputWrap = document.getElementById('pg-enc-output-wrap');

    if (!message) return showToast('⚠️ Please enter a message to encrypt.');
    if (!password) return showToast('⚠️ Please enter or generate a password.');

    try {
      const cipher = CryptoJS.AES.encrypt(message, password).toString();
      document.getElementById('pg-enc-output').textContent = cipher;
      outputWrap.classList.remove('hidden');
      showToast('🔒 Encrypted successfully!');
    } catch {
      showToast('❌ Encryption failed.');
    }
  });

  document.getElementById('btn-copy-pg-enc').addEventListener('click', () => {
    copyText(document.getElementById('pg-enc-output').textContent,
             document.getElementById('btn-copy-pg-enc'));
  });

  // ---- PG: Decrypt with PW ----
  document.getElementById('btn-pg-decrypt').addEventListener('click', () => {
    const cipher = document.getElementById('pg-dec-input').value.trim();
    const password = document.getElementById('pg-dec-password').value.trim();
    const outputWrap = document.getElementById('pg-dec-output-wrap');
    const errorBox = document.getElementById('pg-dec-error');

    outputWrap.classList.add('hidden');
    errorBox.classList.add('hidden');

    if (!cipher) return showToast('⚠️ Please paste the ciphertext.');
    if (!password) return showToast('⚠️ Please enter the password.');

    try {
      const bytes = CryptoJS.AES.decrypt(cipher, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error();

      document.getElementById('pg-dec-output').textContent = decrypted;
      outputWrap.classList.remove('hidden');
      showToast('🔓 Decrypted successfully!');
    } catch {
      errorBox.classList.remove('hidden');
    }
  });

  document.getElementById('btn-copy-pg-dec').addEventListener('click', () => {
    copyText(document.getElementById('pg-dec-output').textContent,
             document.getElementById('btn-copy-pg-dec'));
  });

})();
