/// <reference path="../../js/common.d.ts" />
// Image Compressor Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/image-compressor');
  JoogadTools.renderFooter('tools/image-compressor');

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const controlsPanel = document.getElementById('controls-panel');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityVal = document.getElementById('quality-val');
  const resultsGrid = document.getElementById('results-grid');
  const batchBar = document.getElementById('batch-bar');
  let files = [];
  let compressedBlobs = [];

  document.getElementById('btn-browse').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  qualitySlider.addEventListener('input', () => qualityVal.textContent = qualitySlider.value);

  function handleFiles(fileList) {
    files = Array.from(fileList).filter(f => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024);
    if (files.length === 0) { JoogadTools.showToast('No valid images selected', 'warning'); return; }
    controlsPanel.style.display = 'block';
    resultsGrid.innerHTML = '';
    compressedBlobs = [];
    files.forEach((file, i) => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.id = 'result-' + i;
      card.innerHTML = `
        <div class="result-top">
          <div class="result-preview"><img id="prev-${i}" alt="preview"></div>
          <div class="result-info">
            <h4>${file.name}</h4>
            <div class="result-stats">
              <div class="stat"><div class="stat-label">Original</div><div class="stat-value" id="orig-${i}">${formatSize(file.size)}</div></div>
              <div class="stat"><div class="stat-label">Compressed</div><div class="stat-value" id="comp-${i}">—</div></div>
              <div class="stat"><div class="stat-label">Saved</div><div class="stat-value green" id="saved-${i}">—</div></div>
            </div>
            <div class="savings-bar"><div class="savings-fill" id="bar-${i}" style="width:0%"></div></div>
            <div class="result-actions">
              <button class="btn btn-primary btn-sm" id="dl-${i}" disabled>⬇ Download</button>
            </div>
          </div>
        </div>`;
      resultsGrid.appendChild(card);
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => document.getElementById('prev-' + i).src = e.target.result;
      reader.readAsDataURL(file);
    });
    JoogadTools.showToast(files.length + ' image(s) loaded. Adjust settings and click Compress.', 'info');
  }

  document.getElementById('btn-compress').addEventListener('click', () => {
    if (files.length === 0) return;
    const quality = parseInt(qualitySlider.value) / 100;
    const format = document.getElementById('output-format').value;
    const maxW = parseInt(document.getElementById('max-width').value) || 0;
    compressedBlobs = [];
    let totalOrig = 0, totalComp = 0;

    files.forEach((file, i) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const mime = format === 'auto' ? (file.type || 'image/jpeg') : format;
        canvas.toBlob((blob) => {
          compressedBlobs[i] = { blob, name: file.name.replace(/\.[^.]+$/, '') + '.' + mime.split('/')[1] };
          const origSize = file.size;
          const compSize = blob.size;
          totalOrig += origSize; totalComp += compSize;
          document.getElementById('comp-' + i).textContent = formatSize(compSize);
          const pct = Math.max(0, ((origSize - compSize) / origSize * 100)).toFixed(1);
          const savedEl = document.getElementById('saved-' + i);
          if (compSize < origSize) {
            savedEl.textContent = '-' + pct + '%';
            savedEl.className = 'stat-value green';
          } else {
            savedEl.textContent = '+' + Math.abs(pct) + '%';
            savedEl.className = 'stat-value red';
          }
          document.getElementById('bar-' + i).style.width = Math.min(pct, 100) + '%';
          const dlBtn = document.getElementById('dl-' + i);
          dlBtn.disabled = false;
          dlBtn.onclick = () => saveFile(blob, compressedBlobs[i].name);
          // Check if all done
          const done = compressedBlobs.filter(Boolean).length;
          if (done === files.length) {
            batchBar.classList.remove('hidden');
            const totalPct = ((totalOrig - totalComp) / totalOrig * 100).toFixed(1);
            document.getElementById('batch-summary').textContent = `${files.length} images • ${formatSize(totalOrig)} → ${formatSize(totalComp)} (${totalPct}% saved)`;
            JoogadTools.showToast('All images compressed!', 'success');
          }
        }, mime, quality);
      };
      img.src = URL.createObjectURL(file);
    });
  });

  document.getElementById('btn-download-all').addEventListener('click', async () => {
    for (let i = 0; i < compressedBlobs.length; i++) {
      if (compressedBlobs[i]) await saveFile(compressedBlobs[i].blob, compressedBlobs[i].name);
    }
  });

  async function saveFile(blob, filename) {
    if (window.showSaveFilePicker) {
      try {
        const ext = filename.split('.').pop();
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'Image', accept: { ['image/' + ext]: ['.' + ext] } }] });
        const w = await handle.createWritable(); await w.write(blob); await w.close(); return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
});
