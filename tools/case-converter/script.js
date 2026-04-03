// Case Converter — Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/case-converter');
  JoogadTools.renderFooter('tools/case-converter');

  const input = document.getElementById('case-input');
  const output = document.getElementById('case-output');
  const activeBadge = document.getElementById('active-case');

  let currentCase = null;

  // Utility: split text into words
  function getWords(text) {
    // Handle camelCase/PascalCase splitting
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Handle snake_case, kebab-case, dot.case
    text = text.replace(/[_\-\.]/g, ' ');
    // Split on whitespace
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  // Case conversion functions
  const converters = {
    upper: (text) => text.toUpperCase(),
    lower: (text) => text.toLowerCase(),
    title: (text) => {
      return text.replace(/\w\S*/g, (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      );
    },
    sentence: (text) => {
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
    },
    camel: (text) => {
      const words = getWords(text);
      return words.map((w, i) =>
        i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join('');
    },
    pascal: (text) => {
      const words = getWords(text);
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    },
    snake: (text) => {
      const words = getWords(text);
      return words.map(w => w.toLowerCase()).join('_');
    },
    kebab: (text) => {
      const words = getWords(text);
      return words.map(w => w.toLowerCase()).join('-');
    },
    constant: (text) => {
      const words = getWords(text);
      return words.map(w => w.toUpperCase()).join('_');
    },
    dot: (text) => {
      const words = getWords(text);
      return words.map(w => w.toLowerCase()).join('.');
    },
    toggle: (text) => {
      return text.split('').map(c => {
        if (c === c.toUpperCase()) return c.toLowerCase();
        return c.toUpperCase();
      }).join('');
    },
    alternating: (text) => {
      let i = 0;
      return text.split('').map(c => {
        if (/[a-zA-Z]/.test(c)) {
          return (i++ % 2 === 0) ? c.toLowerCase() : c.toUpperCase();
        }
        return c;
      }).join('');
    }
  };

  // Convert and display
  function convert(caseName) {
    const text = input.value;
    if (!text.trim()) {
      JoogadTools.showToast('Please enter some text first', 'warning');
      return;
    }

    currentCase = caseName;
    output.value = converters[caseName](text);
    activeBadge.textContent = document.querySelector(`[data-case="${caseName}"]`).textContent;

    // Update active button
    document.querySelectorAll('.case-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-case="${caseName}"]`).classList.add('active');
  }

  // Text stats
  function updateStats() {
    const text = input.value;
    document.getElementById('stat-chars').textContent = text.length + ' chars';
    document.getElementById('stat-words').textContent = (text.trim() ? text.trim().split(/\s+/).length : 0) + ' words';
    document.getElementById('stat-lines').textContent = (text ? text.split('\n').length : 0) + ' lines';

    // Auto re-convert if a case is selected
    if (currentCase && text.trim()) {
      output.value = converters[currentCase](text);
    }
  }

  // Event listeners
  document.querySelectorAll('.case-btn').forEach(btn => {
    btn.addEventListener('click', () => convert(btn.dataset.case));
  });

  input.addEventListener('input', updateStats);

  document.getElementById('clear-input').addEventListener('click', () => {
    input.value = '';
    output.value = '';
    currentCase = null;
    activeBadge.textContent = '—';
    document.querySelectorAll('.case-btn').forEach(btn => btn.classList.remove('active'));
    updateStats();
  });

  document.getElementById('paste-input').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
      updateStats();
      JoogadTools.showToast('Text pasted!', 'success');
    } catch (e) {
      JoogadTools.showToast('Paste not supported — use Ctrl+V', 'warning');
    }
  });

  document.getElementById('copy-output').addEventListener('click', () => {
    if (output.value) {
      JoogadTools.copyToClipboard(output.value);
    } else {
      JoogadTools.showToast('Nothing to copy', 'warning');
    }
  });

  document.getElementById('download-output').addEventListener('click', () => {
    if (output.value) {
      JoogadTools.downloadFile(output.value, 'converted-text.txt');
    } else {
      JoogadTools.showToast('Nothing to download', 'warning');
    }
  });
});
