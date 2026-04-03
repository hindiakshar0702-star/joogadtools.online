// Password Generator — Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/password-generator');
  JoogadTools.renderFooter('tools/password-generator');
  JoogadTools.initTabs();

  // Word list for passphrases
  const wordList = [
    'apple','river','storm','light','dance','ocean','music','flame','cloud','stone',
    'dream','tiger','eagle','frost','bloom','spark','swift','brave','quest','lunar',
    'solar','pearl','amber','coral','maple','cedar','aspen','frost','blaze','crisp',
    'dusk','dawn','peak','vale','mesa','cove','glen','reef','surf','tide',
    'wind','rain','snow','star','moon','tree','leaf','vine','rose','sage',
    'mint','ruby','opal','jade','onyx','silk','lava','echo','mist','haze',
    'bolt','glow','flux','nova','apex','zero','byte','code','data','link',
    'node','port','wave','beam','chip','core','disk','grid','hash','loop',
    'mode','nest','path','quad','root','scan','sync','task','unit','view',
    'zone','arch','bond','cape','dome','edge','ford','gate','hall','isle',
    'jazz','keen','loft','maze','nook','oasis','pine','quay','rift','silo'
  ];

  const CHARS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  const AMBIGUOUS = '0OIl1';

  let currentMode = 'password';

  // DOM elements
  const output = document.getElementById('password-output');
  const lengthSlider = document.getElementById('password-length');
  const lengthValue = document.getElementById('length-value');
  const wordCountSlider = document.getElementById('word-count');
  const wordCountValue = document.getElementById('word-count-value');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');
  const strengthTime = document.getElementById('strength-time');

  // Slider display updates
  lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
  });

  wordCountSlider.addEventListener('input', () => {
    wordCountValue.textContent = wordCountSlider.value;
  });

  // Track mode via tabs
  document.querySelectorAll('#pass-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.tab === 'tab-passphrase' ? 'passphrase' : 'password';
    });
  });

  // Secure random number
  function secureRandom(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  // Generate password
  function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const useUpper = document.getElementById('opt-uppercase').checked;
    const useLower = document.getElementById('opt-lowercase').checked;
    const useNumbers = document.getElementById('opt-numbers').checked;
    const useSymbols = document.getElementById('opt-symbols').checked;
    const noAmbiguous = document.getElementById('opt-no-ambiguous').checked;

    let chars = '';
    if (useUpper) chars += CHARS.uppercase;
    if (useLower) chars += CHARS.lowercase;
    if (useNumbers) chars += CHARS.numbers;
    if (useSymbols) chars += CHARS.symbols;

    if (!chars) {
      JoogadTools.showToast('Select at least one character type', 'warning');
      return '';
    }

    if (noAmbiguous) {
      chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('');
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[secureRandom(chars.length)];
    }

    return password;
  }

  // Generate passphrase
  function generatePassphrase() {
    const count = parseInt(wordCountSlider.value);
    const separator = document.getElementById('phrase-separator').value;
    const capitalize = document.getElementById('opt-capitalize-words').checked;
    const addNumber = document.getElementById('opt-add-number').checked;

    let words = [];
    for (let i = 0; i < count; i++) {
      let word = wordList[secureRandom(wordList.length)];
      if (capitalize) word = word.charAt(0).toUpperCase() + word.slice(1);
      words.push(word);
    }

    let passphrase = words.join(separator);
    if (addNumber) passphrase += separator + secureRandom(1000);

    return passphrase;
  }

  // Calculate password strength
  function calculateStrength(password) {
    let score = 0;
    const len = password.length;

    // Length score
    if (len >= 8) score += 1;
    if (len >= 12) score += 1;
    if (len >= 16) score += 1;
    if (len >= 24) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Unique characters ratio
    const unique = new Set(password).size;
    if (unique / len > 0.6) score += 1;
    if (unique / len > 0.8) score += 1;

    // Determine level
    let level, color, percent, timeText;
    if (score <= 2) {
      level = 'Very Weak';
      color = '#FF6B6B';
      percent = 15;
      timeText = 'Cracked instantly';
    } else if (score <= 4) {
      level = 'Weak';
      color = '#FFA726';
      percent = 35;
      timeText = 'Minutes to hours';
    } else if (score <= 6) {
      level = 'Moderate';
      color = '#FFD54F';
      percent = 55;
      timeText = 'Days to months';
    } else if (score <= 8) {
      level = 'Strong';
      color = '#4ECDC4';
      percent = 80;
      timeText = 'Years to decades';
    } else {
      level = 'Very Strong';
      color = '#66BB6A';
      percent = 100;
      timeText = 'Centuries+';
    }

    return { level, color, percent, timeText };
  }

  // Update strength display
  function updateStrength(password) {
    if (!password) {
      strengthFill.style.width = '0%';
      strengthLabel.textContent = '—';
      strengthLabel.style.color = '';
      strengthTime.textContent = '';
      return;
    }

    const { level, color, percent, timeText } = calculateStrength(password);
    strengthFill.style.width = percent + '%';
    strengthFill.style.background = color;
    strengthLabel.textContent = level;
    strengthLabel.style.color = color;
    strengthTime.textContent = `⏱ ${timeText}`;
  }

  // Main generate function
  function generate() {
    const password = currentMode === 'passphrase' ? generatePassphrase() : generatePassword();
    if (password) {
      output.value = password;
      updateStrength(password);
    }
  }

  // Event listeners
  document.getElementById('generate-password').addEventListener('click', generate);
  document.getElementById('regenerate').addEventListener('click', generate);

  document.getElementById('copy-password').addEventListener('click', () => {
    if (output.value) {
      JoogadTools.copyToClipboard(output.value);
    }
  });

  // Bulk generate
  document.getElementById('bulk-generate').addEventListener('click', () => {
    const count = parseInt(document.getElementById('bulk-count').value);
    const bulkList = document.getElementById('bulk-list');
    const bulkResults = document.getElementById('bulk-results');
    bulkList.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const pw = currentMode === 'passphrase' ? generatePassphrase() : generatePassword();
      const item = document.createElement('div');
      item.className = 'bulk-item';
      item.innerHTML = `
        <span class="bulk-item-text" title="${pw}">${pw}</span>
        <button class="bulk-item-copy" data-password="${pw}">📋</button>
      `;
      bulkList.appendChild(item);
    }

    bulkResults.style.display = 'block';

    // Copy individual
    bulkList.querySelectorAll('.bulk-item-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        JoogadTools.copyToClipboard(btn.dataset.password);
      });
    });
  });

  // Copy all bulk
  document.getElementById('copy-all-bulk').addEventListener('click', () => {
    const items = document.querySelectorAll('.bulk-item-text');
    const all = Array.from(items).map(el => el.textContent).join('\n');
    JoogadTools.copyToClipboard(all);
  });

  // Generate on load
  generate();
});
