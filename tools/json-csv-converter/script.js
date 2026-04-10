/// <reference path="../../js/common.d.ts" />
// JSON ↔ CSV Converter — Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/json-csv-converter');
  JoogadTools.renderFooter('tools/json-csv-converter');

  const inputArea = document.getElementById('json-input');
  const outputArea = document.getElementById('json-output');
  const inputFormat = document.getElementById('input-format');
  const validationStatus = document.getElementById('validation-status');
  const outputBadge = document.getElementById('output-format-badge');
  const inputSize = document.getElementById('input-size');
  const outputSize = document.getElementById('output-size');
  const treeCard = document.getElementById('tree-view-card');
  const treeContainer = document.getElementById('tree-container');

  // ---- Sample Data ----
  const sampleJSON = JSON.stringify([
    { name: "Rahul Sharma", age: 25, city: "Delhi", email: "rahul@example.com", active: true },
    { name: "Priya Patel", age: 28, city: "Mumbai", email: "priya@example.com", active: true },
    { name: "Amit Kumar", age: 32, city: "Bangalore", email: "amit@example.com", active: false },
    { name: "Sneha Gupta", age: 24, city: "Kolkata", email: "sneha@example.com", active: true },
    { name: "Vikram Singh", age: 30, city: "Jaipur", email: "vikram@example.com", active: true }
  ], null, 2);

  const sampleCSV = `name,age,city,email,active
Rahul Sharma,25,Delhi,rahul@example.com,true
Priya Patel,28,Mumbai,priya@example.com,true
Amit Kumar,32,Bangalore,amit@example.com,false
Sneha Gupta,24,Kolkata,sneha@example.com,true
Vikram Singh,30,Jaipur,vikram@example.com,true`;

  // ---- Conversion Functions ----

  function jsonToCsv(jsonStr, delimiter = ',', includeHeader = true) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }

    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        data = [data];
      } else {
        throw new Error('JSON must be an array of objects');
      }
    }

    if (data.length === 0) return '';

    // Collect all unique keys
    const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];

    const escapeCell = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    let csv = '';
    if (includeHeader) {
      csv = keys.map(escapeCell).join(delimiter) + '\n';
    }

    csv += data.map(row =>
      keys.map(key => escapeCell(row[key])).join(delimiter)
    ).join('\n');

    return csv;
  }

  function csvToJson(csvStr, delimiter = ',') {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

    const parseRow = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
          if (c === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            current += c;
          }
        } else {
          if (c === '"') {
            inQuotes = true;
          } else if (c === delimiter) {
            result.push(current);
            current = '';
          } else {
            current += c;
          }
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseRow(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseRow(lines[i]);
      const obj = {};
      headers.forEach((key, idx) => {
        let val = values[idx] || '';
        // Auto-detect types
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (val === 'null' || val === '') val = null;
        else if (!isNaN(val) && val.trim() !== '') val = Number(val);
        obj[key.trim()] = val;
      });
      result.push(obj);
    }

    return JSON.stringify(result, null, 2);
  }

  // ---- Validate JSON ----
  function validateInput() {
    const text = inputArea.value.trim();
    if (!text) {
      validationStatus.textContent = '';
      validationStatus.className = 'validation-badge';
      return;
    }

    if (inputFormat.value === 'json') {
      try {
        JSON.parse(text);
        validationStatus.textContent = '✓ Valid JSON';
        validationStatus.className = 'validation-badge valid';
      } catch (e) {
        validationStatus.textContent = '✕ Invalid JSON';
        validationStatus.className = 'validation-badge invalid';
      }
    } else {
      const lines = text.trim().split('\n');
      validationStatus.textContent = lines.length >= 2 ? `✓ ${lines.length - 1} rows` : '✕ Need header + data';
      validationStatus.className = `validation-badge ${lines.length >= 2 ? 'valid' : 'invalid'}`;
    }
  }

  // ---- Update sizes ----
  function updateSizes() {
    const inputBytes = new Blob([inputArea.value]).size;
    const outputBytes = new Blob([outputArea.value]).size;
    inputSize.textContent = formatBytes(inputBytes);
    outputSize.textContent = formatBytes(outputBytes);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 bytes';
    if (bytes < 1024) return bytes + ' bytes';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  // ---- Tree View ----
  function buildTree(data, isRoot = true) {
    if (data === null) return '<span class="tree-value null">null</span>';
    if (typeof data === 'string') return `<span class="tree-value string">"${escapeHtml(data)}"</span>`;
    if (typeof data === 'number') return `<span class="tree-value number">${data}</span>`;
    if (typeof data === 'boolean') return `<span class="tree-value boolean">${data}</span>`;

    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const openBracket = isArray ? '[' : '{';
    const closeBracket = isArray ? ']' : '}';

    if (keys.length === 0) {
      return `<span class="tree-bracket">${openBracket}${closeBracket}</span>`;
    }

    let html = `<span class="tree-toggle" onclick="this.classList.toggle('collapsed');this.parentElement.querySelector('.tree-children').classList.toggle('hidden')">▼</span>`;
    html += `<span class="tree-bracket">${openBracket}</span>`;
    html += `<span class="tree-bracket" style="color:var(--text-muted);font-size:0.75rem;"> ${keys.length} ${isArray ? 'items' : 'keys'}</span>`;
    html += `<div class="tree-children tree-node">`;

    keys.forEach((key, i) => {
      const comma = i < keys.length - 1 ? ',' : '';
      if (isArray) {
        html += `<div><span class="tree-key">${key}</span>: ${buildTree(data[key], false)}${comma}</div>`;
      } else {
        html += `<div><span class="tree-key">"${escapeHtml(key)}"</span>: ${buildTree(data[key], false)}${comma}</div>`;
      }
    });

    html += `</div><span class="tree-bracket">${closeBracket}</span>`;
    return html;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showTree(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      treeContainer.innerHTML = buildTree(data);
      treeCard.style.display = 'block';
    } catch (e) {
      treeCard.style.display = 'none';
    }
  }

  // ---- Event Listeners ----

  // Convert
  document.getElementById('convert-btn').addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) {
      JoogadTools.showToast('Please enter some data first', 'warning');
      return;
    }

    const format = inputFormat.value;
    const delimiter = document.getElementById('csv-delimiter').value === '\\t' ? '\t' : document.getElementById('csv-delimiter').value;
    const includeHeader = document.getElementById('include-header').checked;

    try {
      if (format === 'json') {
        // JSON → CSV
        outputArea.value = jsonToCsv(text, delimiter, includeHeader);
        outputBadge.textContent = 'CSV';
        showTree(text);
        JoogadTools.showToast('Converted JSON → CSV', 'success');
      } else {
        // CSV → JSON
        outputArea.value = csvToJson(text, delimiter);
        outputBadge.textContent = 'JSON';
        showTree(outputArea.value);
        JoogadTools.showToast('Converted CSV → JSON', 'success');
      }
      updateSizes();
    } catch (e) {
      JoogadTools.showToast(e.message, 'error');
    }
  });

  // Input validation on type
  inputArea.addEventListener('input', () => {
    validateInput();
    updateSizes();
  });

  inputFormat.addEventListener('change', validateInput);

  // Load sample
  document.getElementById('load-sample').addEventListener('click', () => {
    inputArea.value = inputFormat.value === 'json' ? sampleJSON : sampleCSV;
    validateInput();
    updateSizes();
    JoogadTools.showToast('Sample data loaded', 'info');
  });

  // Clear
  document.getElementById('clear-input').addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    outputBadge.textContent = '—';
    treeCard.style.display = 'none';
    validationStatus.textContent = '';
    validationStatus.className = 'validation-badge';
    updateSizes();
  });

  // Prettify
  document.getElementById('prettify-btn').addEventListener('click', () => {
    if (inputFormat.value !== 'json') return JoogadTools.showToast('Prettify works with JSON only', 'warning');
    try {
      const data = JSON.parse(inputArea.value);
      inputArea.value = JSON.stringify(data, null, 2);
      validateInput();
      JoogadTools.showToast('JSON prettified', 'success');
    } catch (e) {
      JoogadTools.showToast('Invalid JSON: ' + e.message, 'error');
    }
  });

  // Minify
  document.getElementById('minify-btn').addEventListener('click', () => {
    if (inputFormat.value !== 'json') return JoogadTools.showToast('Minify works with JSON only', 'warning');
    try {
      const data = JSON.parse(inputArea.value);
      inputArea.value = JSON.stringify(data);
      validateInput();
      updateSizes();
      JoogadTools.showToast('JSON minified', 'success');
    } catch (e) {
      JoogadTools.showToast('Invalid JSON: ' + e.message, 'error');
    }
  });

  // Copy output
  document.getElementById('copy-output').addEventListener('click', () => {
    if (outputArea.value) {
      JoogadTools.copyToClipboard(outputArea.value);
    } else {
      JoogadTools.showToast('Nothing to copy', 'warning');
    }
  });

  // Download output
  document.getElementById('download-output').addEventListener('click', () => {
    if (!outputArea.value) return JoogadTools.showToast('Nothing to download', 'warning');
    const format = outputBadge.textContent.toLowerCase();
    const ext = format === 'csv' ? 'csv' : 'json';
    const mime = format === 'csv' ? 'text/csv' : 'application/json';
    JoogadTools.downloadFile(outputArea.value, `converted-data.${ext}`, mime);
  });

  // Toggle tree
  document.getElementById('toggle-tree').addEventListener('click', () => {
    const toggles = treeContainer.querySelectorAll('.tree-toggle');
    const children = treeContainer.querySelectorAll('.tree-children');
    const btn = document.getElementById('toggle-tree');
    const isExpanded = btn.textContent.includes('Collapse');

    toggles.forEach(t => {
      if (isExpanded) t.classList.add('collapsed');
      else t.classList.remove('collapsed');
    });
    children.forEach(c => {
      if (isExpanded) c.classList.add('hidden');
      else c.classList.remove('hidden');
    });
    btn.textContent = isExpanded ? 'Expand All' : 'Collapse All';
  });

  // Tab handling for textarea (insert actual tab)
  inputArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = inputArea.selectionStart;
      const end = inputArea.selectionEnd;
      inputArea.value = inputArea.value.substring(0, start) + '  ' + inputArea.value.substring(end);
      inputArea.selectionStart = inputArea.selectionEnd = start + 2;
    }
  });
});
