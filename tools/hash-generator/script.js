/// <reference path="../../js/common.d.ts" />
// Hash Generator Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/hash-generator');
  JoogadTools.renderFooter('tools/hash-generator');

  const textInput = document.getElementById('hash-input');
  const fileInput = document.getElementById('hash-file');
  const filenameLbl = document.getElementById('hash-filename');
  const btnHash = document.getElementById('btn-hash');
  const verifyInput = document.getElementById('hash-verify');
  const verifyResult = document.getElementById('verify-result');

  const outputs = {
    'SHA-256': document.getElementById('h-sha256'),
    'SHA-512': document.getElementById('h-sha512'),
    'SHA-1': document.getElementById('h-sha1')
  };

  const algoMap = {
    'SHA-256': 'SHA-256',
    'SHA-512': 'SHA-512',
    'SHA-1': 'SHA-1'
  };

  let currentHashes = {};
  let activeFile = null;

  // File selection
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      activeFile = e.target.files[0];
      filenameLbl.textContent = activeFile.name + ' (' + formatSize(activeFile.size) + ')';
      textInput.value = '';
      textInput.disabled = true;
      textInput.placeholder = 'File selected — hashes will be computed from file.';
    }
  });

  textInput.addEventListener('input', () => {
    if (textInput.value.trim()) {
      activeFile = null;
      fileInput.value = '';
      filenameLbl.textContent = '';
      textInput.disabled = false;
    }
  });

  // Generate hashes
  btnHash.addEventListener('click', async () => {
    const text = textInput.value;

    if (!text && !activeFile) {
      JoogadTools.showToast('Please enter text or select a file.', 'warning');
      return;
    }

    btnHash.disabled = true;
    btnHash.innerHTML = '⏳ Hashing...';

    try {
      let data;
      if (activeFile) {
        data = await readFileAsBuffer(activeFile);
      } else {
        data = new TextEncoder().encode(text);
      }

      currentHashes = {};
      for (const [label, algo] of Object.entries(algoMap)) {
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        currentHashes[label] = hashHex;
        outputs[label].value = hashHex;
      }

      JoogadTools.showToast('Hashes generated!', 'success');
      verifyCheck();
    } catch (err) {
      JoogadTools.showToast('Error generating hash: ' + err.message, 'error');
    } finally {
      btnHash.disabled = false;
      btnHash.innerHTML = '⚡ Generate Hashes';
    }
  });

  // Verify
  verifyInput.addEventListener('input', verifyCheck);

  function verifyCheck() {
    const expected = verifyInput.value.trim().toLowerCase();
    if (!expected || Object.keys(currentHashes).length === 0) {
      verifyResult.classList.add('hidden');
      return;
    }

    verifyResult.classList.remove('hidden');
    let matchFound = null;
    for (const [algo, hash] of Object.entries(currentHashes)) {
      if (hash === expected) {
        matchFound = algo;
        break;
      }
    }

    if (matchFound) {
      verifyResult.className = 'verify-result mt-sm match';
      verifyResult.innerHTML = `✅ <strong>Match!</strong> The hash matches <strong>${matchFound}</strong> output.`;
    } else {
      verifyResult.className = 'verify-result mt-sm no-match';
      verifyResult.innerHTML = `❌ <strong>No match.</strong> The provided hash does not match any generated hash.`;
    }
  }

  // Helpers
  function readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
});
