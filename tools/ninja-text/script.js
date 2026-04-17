/* ============================================================
 * Ninja Text — script.js
 * Zero-Width Character Steganography & AES Encryption Engine
 * ============================================================ */

const NinjaApp = {

  // ZWC Dictionary
  ZWC: {
    '0': '\u200B', // Zero Width Space
    '1': '\u200C', // Zero Width Non-Joiner
    'SEP': '\u200D' // Zero Width Joiner (Separator)
  },

  init() {
    this.bindEvents();
  },

  // Custom Toast Notification (Replaces alerts)
  toast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = 'toast';
    if(type === 'error') el.style.borderLeft = '3px solid #ef4444';
    if(type === 'success') el.style.borderLeft = '3px solid #10b981';
    
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 300);
    }, 4000);
  },

  bindEvents() {
    // Tabs Navigation
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

    // Action Buttons
    document.getElementById('btn-generate').addEventListener('click', () => this.generateNinjaText());
    document.getElementById('btn-reveal').addEventListener('click', () => this.revealSecret());

    // Copy & Share Output Buttons
    document.getElementById('btn-copy-ninja').addEventListener('click', () => {
      const el = document.getElementById('ninja-output');
      this.copyToClipboard(el.innerText, 'Ninja Text copied to clipboard!');
    });
    
    document.getElementById('btn-copy-reveal').addEventListener('click', () => {
      const el = document.getElementById('reveal-output');
      this.copyToClipboard(el.innerText, 'Secret message copied to clipboard!');
    });

    document.getElementById('btn-share-wa').addEventListener('click', () => {
      const text = document.getElementById('ninja-output').innerText;
      if (!text) return this.toast('No text to share!', 'error');
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  },

  copyToClipboard(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast(successMsg, 'success');
    }).catch(err => {
      this.toast('Failed to copy: ' + err, 'error');
    });
  },

  // ================= MAIN ENGINE =================

  generateNinjaText() {
    const coverText = document.getElementById('cover-text').value;
    const secretMsg = document.getElementById('secret-msg').value;
    const password = document.getElementById('hide-password').value || 'ninja-default-key';
    const expiryHrs = parseInt(document.getElementById('msg-expiry').value);

    // Validations
    if (!coverText) return this.toast('Cover Text is required to hide the message!', 'error');
    if (!secretMsg) return this.toast('Secret Message cannot be empty!', 'error');

    // 1. Build Payload JSON
    let expiryTimestamp = 0; // 0 means never expire
    if (expiryHrs > 0) {
      expiryTimestamp = Date.now() + (expiryHrs * 60 * 60 * 1000);
    }
    const payload = JSON.stringify({ m: secretMsg, t: expiryTimestamp });

    try {
      // 2. Encrypt Payload using AES (CryptoJS)
      const encryptedBase64 = CryptoJS.AES.encrypt(payload, password).toString();

      // 3. Convert Base64 String to Binary, then to ZWC
      let hiddenPart = '';
      for (let i = 0; i < encryptedBase64.length; i++) {
        // Get ascii char code -> binary string (padded to 8 bits)
        const binaryString = encryptedBase64.charCodeAt(i).toString(2).padStart(8, '0');
        
        // Map 0 -> \u200B and 1 -> \u200C
        let zwcChar = '';
        for (let bit of binaryString) {
          zwcChar += this.ZWC[bit];
        }
        
        // Append mapped binary and a separator (\u200D)
        hiddenPart += zwcChar + this.ZWC['SEP'];
      }

      // 4. Inject invisible hidden part into the Cover Text
      // We'll put it right after the first character of the cover text to hide it deeply
      const resultText = coverText.slice(0, 1) + hiddenPart + coverText.slice(1);

      // Display logic
      document.getElementById('hide-output-area').classList.add('active');
      document.getElementById('ninja-output').innerText = resultText;
      this.toast('Ninja Text generated successfully!', 'success');
      
    } catch (e) {
      this.toast('Encryption Error: ' + e.message, 'error');
    }
  },

  revealSecret() {
    const ninjaText = document.getElementById('ninja-input').value;
    const password = document.getElementById('reveal-password').value || 'ninja-default-key';

    if (!ninjaText) return this.toast('Please paste the Ninja Text first!', 'error');

    // 1. Extract the Hidden Part using Regex
    // Look for a block consisting ONLY of our zero-width characters
    const zwcRegex = new RegExp(`[${this.ZWC['0']}${this.ZWC['1']}${this.ZWC['SEP']}]+`, 'g');
    const matches = ninjaText.match(zwcRegex);

    if (!matches || matches.length === 0) {
      return this.toast('No hidden Ninja Text found in this message.', 'error');
    }

    // Usually the largest match is our block 
    const hiddenBlock = matches.reduce((a, b) => a.length > b.length ? a : b);

    // 2. Decode ZWC back to Binary, then to Base64
    const chunks = hiddenBlock.split(this.ZWC['SEP']).filter(Boolean);
    let extractedBase64 = '';

    try {
      chunks.forEach(chunk => {
        let binaryStr = '';
        for (let char of chunk) {
          if (char === this.ZWC['0']) binaryStr += '0';
          else if (char === this.ZWC['1']) binaryStr += '1';
        }
        if(binaryStr.length === 8) {
          extractedBase64 += String.fromCharCode(parseInt(binaryStr, 2));
        }
      });
    } catch(e) {
      return this.toast('Corrupted hidden text.', 'error');
    }

    // 3. Decrypt the Base64 String using Password
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(extractedBase64, password);
      const payloadStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!payloadStr) throw new Error("Empty Payload");

      // 4. Parse Payload & Check Expiry
      const payload = JSON.parse(payloadStr);

      if (payload.t !== 0 && Date.now() > payload.t) {
        // Expired
        document.getElementById('reveal-output-area').classList.add('active');
        document.getElementById('reveal-output').innerText = "💣 BOOM! This message has self-destructed because its expiry time has passed.";
        document.getElementById('reveal-output').style.color = "#ef4444";
        document.getElementById('reveal-output').style.borderColor = "#ef4444";
        return this.toast('Message Expired.', 'warning');
      }

      // Success Display
      document.getElementById('reveal-output-area').classList.add('active');
      document.getElementById('reveal-output').innerText = payload.m;
      document.getElementById('reveal-output').style.color = "#fff";
      document.getElementById('reveal-output').style.borderColor = "#00ff88";
      this.toast('Secret Revealed!', 'success');

    } catch (e) {
      return this.toast('Incorrect Password or Corrupted Text!', 'error');
    }
  }

};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => NinjaApp.init());
