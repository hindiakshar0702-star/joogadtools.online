/// <reference path="../../js/common.d.ts" />
// QR Code Generator — Complete Script with all 12 features
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/qr-generator');
  JoogadTools.renderFooter('tools/qr-generator');

  // ===== DOM Refs =====
  const qrType = document.getElementById('qr-type');
  const previewBox = document.getElementById('qr-preview-box');
  const placeholder = document.getElementById('qr-placeholder');
  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  const actionsDiv = document.getElementById('qr-actions');
  const generateBtn = document.getElementById('btn-generate');

  // Hidden div for qrcodejs
  const qrRenderDiv = document.createElement('div');
  qrRenderDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(qrRenderDiv);

  let qrInstance = null;
  let logoImage = null;
  let lastQRData = '';

  // ===== 1. QR TYPE PANEL SWITCHING =====
  qrType.addEventListener('change', () => {
    document.querySelectorAll('.qr-input-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + qrType.value);
    if (panel) panel.classList.add('active');
  });

  // ===== 2. COLOR DISPLAY UPDATES =====
  ['opt-fg', 'opt-bg', 'opt-fg2'].forEach(id => {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id.replace('opt-', '') + '-val');
    if (el && valEl) el.addEventListener('input', () => valEl.textContent = el.value);
  });

  // Gradient toggle
  document.getElementById('opt-gradient').addEventListener('change', (e) => {
    document.getElementById('gradient-opts').classList.toggle('hidden', !e.target.checked);
  });

  // Frame custom text
  document.getElementById('opt-frame').addEventListener('change', (e) => {
    document.getElementById('opt-frame-custom').classList.toggle('hidden', e.target.value !== 'custom');
  });

  // ===== 3. LOGO UPLOAD =====
  document.getElementById('btn-logo-upload').addEventListener('click', () => {
    document.getElementById('opt-logo').click();
  });

  document.getElementById('opt-logo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoImage = new Image();
      logoImage.onload = () => {
        document.getElementById('logo-filename').textContent = file.name;
        document.getElementById('btn-logo-clear').style.display = 'inline-flex';
        // Auto-set error correction to High when logo is added
        document.getElementById('opt-ec').value = 'H';
        JoogadTools.showToast('Logo loaded! Error correction set to High.', 'success');
      };
      logoImage.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-logo-clear').addEventListener('click', () => {
    logoImage = null;
    document.getElementById('opt-logo').value = '';
    document.getElementById('logo-filename').textContent = 'No file';
    document.getElementById('btn-logo-clear').style.display = 'none';
  });

  // ===== 4. LOCATION: USE MY LOCATION =====
  document.getElementById('btn-my-location').addEventListener('click', () => {
    if (!navigator.geolocation) {
      JoogadTools.showToast('Geolocation not supported', 'error');
      return;
    }
    JoogadTools.showToast('Getting location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('inp-loc-lat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('inp-loc-lng').value = pos.coords.longitude.toFixed(6);
        JoogadTools.showToast('Location detected!', 'success');
      },
      (err) => JoogadTools.showToast('Location error: ' + err.message, 'error'),
      { enableHighAccuracy: true }
    );
  });

  // ===== BUILD QR DATA STRING =====
  function buildQRData() {
    const type = qrType.value;
    switch (type) {
      case 'text': {
        const t = document.getElementById('inp-text').value.trim();
        if (!t) { JoogadTools.showToast('Enter text or URL', 'warning'); return null; }
        return t;
      }
      case 'wifi': {
        const ssid = document.getElementById('inp-wifi-ssid').value.trim();
        if (!ssid) { JoogadTools.showToast('Enter WiFi SSID', 'warning'); return null; }
        const pass = document.getElementById('inp-wifi-pass').value;
        const sec = document.getElementById('inp-wifi-sec').value;
        const hidden = document.getElementById('inp-wifi-hidden').checked;
        return `WIFI:T:${sec};S:${ssid};P:${pass};H:${hidden ? 'true' : 'false'};;`;
      }
      case 'upi': {
        const vpa = document.getElementById('inp-upi-vpa').value.trim();
        const name = document.getElementById('inp-upi-name').value.trim();
        if (!vpa || !name) { JoogadTools.showToast('UPI ID and Name required', 'warning'); return null; }
        const p = new URLSearchParams({ pa: vpa, pn: name, cu: 'INR' });
        const amt = document.getElementById('inp-upi-amount').value;
        const note = document.getElementById('inp-upi-note').value.trim();
        if (amt && parseFloat(amt) > 0) p.set('am', amt);
        if (note) p.set('tn', note);
        return 'upi://pay?' + p.toString();
      }
      case 'vcard': {
        const n = document.getElementById('inp-vc-name').value.trim();
        if (!n) { JoogadTools.showToast('Name required', 'warning'); return null; }
        let v = 'BEGIN:VCARD\nVERSION:3.0\nFN:' + n;
        const ph = document.getElementById('inp-vc-phone').value.trim();
        const em = document.getElementById('inp-vc-email').value.trim();
        const ur = document.getElementById('inp-vc-url').value.trim();
        const or = document.getElementById('inp-vc-org').value.trim();
        if (ph) v += '\nTEL:' + ph;
        if (em) v += '\nEMAIL:' + em;
        if (ur) v += '\nURL:' + ur;
        if (or) v += '\nORG:' + or;
        v += '\nEND:VCARD';
        return v;
      }
      case 'whatsapp': {
        const ph = document.getElementById('inp-wa-phone').value.trim().replace(/\D/g, '');
        if (!ph) { JoogadTools.showToast('Phone number required', 'warning'); return null; }
        let url = 'https://wa.me/' + ph;
        const msg = document.getElementById('inp-wa-msg').value.trim();
        if (msg) url += '?text=' + encodeURIComponent(msg);
        return url;
      }
      case 'email': {
        const to = document.getElementById('inp-email-to').value.trim();
        if (!to) { JoogadTools.showToast('Email required', 'warning'); return null; }
        const sub = document.getElementById('inp-email-sub').value.trim();
        const body = document.getElementById('inp-email-body').value.trim();
        let url = 'mailto:' + to;
        const params = [];
        if (sub) params.push('subject=' + encodeURIComponent(sub));
        if (body) params.push('body=' + encodeURIComponent(body));
        if (params.length) url += '?' + params.join('&');
        return url;
      }
      case 'sms': {
        const ph = document.getElementById('inp-sms-phone').value.trim();
        if (!ph) { JoogadTools.showToast('Phone number required', 'warning'); return null; }
        const msg = document.getElementById('inp-sms-msg').value.trim();
        let url = 'sms:' + ph;
        if (msg) url += '?body=' + encodeURIComponent(msg);
        return url;
      }
      case 'phone': {
        const ph = document.getElementById('inp-phone-num').value.trim();
        if (!ph) { JoogadTools.showToast('Phone number required', 'warning'); return null; }
        return 'tel:' + ph;
      }
      case 'location': {
        const lat = document.getElementById('inp-loc-lat').value;
        const lng = document.getElementById('inp-loc-lng').value;
        if (!lat || !lng) { JoogadTools.showToast('Latitude and Longitude required', 'warning'); return null; }
        const label = document.getElementById('inp-loc-label').value.trim();
        let url = 'geo:' + lat + ',' + lng;
        if (label) url += '?q=' + lat + ',' + lng + '(' + encodeURIComponent(label) + ')';
        return url;
      }
      case 'calendar': {
        const title = document.getElementById('inp-cal-title').value.trim();
        const start = document.getElementById('inp-cal-start').value;
        if (!title || !start) { JoogadTools.showToast('Title and Start date required', 'warning'); return null; }
        const end = document.getElementById('inp-cal-end').value || start;
        const loc = document.getElementById('inp-cal-loc').value.trim();
        const desc = document.getElementById('inp-cal-desc').value.trim();
        const fmt = (d) => d.replace(/[-:]/g, '').replace('T', 'T') + '00';
        let cal = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT';
        cal += '\nSUMMARY:' + title;
        cal += '\nDTSTART:' + fmt(start);
        cal += '\nDTEND:' + fmt(end);
        if (loc) cal += '\nLOCATION:' + loc;
        if (desc) cal += '\nDESCRIPTION:' + desc;
        cal += '\nEND:VEVENT\nEND:VCALENDAR';
        return cal;
      }
      default: return null;
    }
  }

  // ===== CUSTOM QR RENDERER =====
  const EC_MAP = { L: QRCode.CorrectLevel ? QRCode.CorrectLevel.L : 1, M: 0, Q: 3, H: 2 };

  function getQRModules(data) {
    qrRenderDiv.innerHTML = '';
    const ecLevel = document.getElementById('opt-ec').value;
    qrInstance = new QRCode(qrRenderDiv, {
      text: data,
      width: 256,
      height: 256,
      correctLevel: QRCode.CorrectLevel[ecLevel] !== undefined ? QRCode.CorrectLevel[ecLevel] : QRCode.CorrectLevel.M
    });
    const model = qrInstance._oQRCode;
    if (!model || !model.modules) throw new Error('QR encoding failed');
    return { modules: model.modules, count: model.moduleCount };
  }

  function renderQR(data) {
    if (!data) return;
    lastQRData = data;

    const size = parseInt(document.getElementById('opt-size').value);
    const fgColor = document.getElementById('opt-fg').value;
    const bgColor = document.getElementById('opt-bg').value;
    const shape = document.getElementById('opt-shape').value;
    const useGradient = document.getElementById('opt-gradient').checked;
    const fgColor2 = document.getElementById('opt-fg2').value;
    const gradDir = document.getElementById('opt-grad-dir').value;
    const frameSel = document.getElementById('opt-frame').value;
    const frameCustom = document.getElementById('opt-frame-custom').value.trim();

    // Get frame text
    const frameTexts = {
      'none': '', 'scan-me': 'SCAN ME', 'pay-here': 'PAY HERE',
      'connect': 'CONNECT WIFI', 'visit': 'VISIT US', 'contact': 'SAVE CONTACT',
      'custom': frameCustom
    };
    const frameText = frameTexts[frameSel] || '';
    const frameHeight = frameText ? 44 : 0;

    const totalHeight = size + frameHeight;
    canvas.width = size;
    canvas.height = totalHeight;

    // Get modules
    let qrData;
    try {
      qrData = getQRModules(data);
    } catch (e) {
      JoogadTools.showToast('Error: ' + e.message, 'error');
      return;
    }

    const { modules, count } = qrData;
    const margin = 2;
    const totalCells = count + margin * 2;
    const cellSize = size / totalCells;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, totalHeight);

    // Create foreground fill style
    let fgFill;
    if (useGradient) {
      let grd;
      if (gradDir === 'horizontal') {
        grd = ctx.createLinearGradient(0, 0, size, 0);
      } else if (gradDir === 'vertical') {
        grd = ctx.createLinearGradient(0, 0, 0, size);
      } else {
        grd = ctx.createLinearGradient(0, 0, size, size);
      }
      grd.addColorStop(0, fgColor);
      grd.addColorStop(1, fgColor2);
      fgFill = grd;
    } else {
      fgFill = fgColor;
    }

    ctx.fillStyle = fgFill;

    // Draw modules with selected shape
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (!modules[row][col]) continue;
        const x = (col + margin) * cellSize;
        const y = (row + margin) * cellSize;
        const s = cellSize;

        switch (shape) {
          case 'dots': {
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s * 0.42, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'rounded': {
            const r = s * 0.3;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + s - r, y);
            ctx.quadraticCurveTo(x + s, y, x + s, y + r);
            ctx.lineTo(x + s, y + s - r);
            ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
            ctx.lineTo(x + r, y + s);
            ctx.quadraticCurveTo(x, y + s, x, y + s - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'diamond': {
            ctx.beginPath();
            ctx.moveTo(x + s / 2, y);
            ctx.lineTo(x + s, y + s / 2);
            ctx.lineTo(x + s / 2, y + s);
            ctx.lineTo(x, y + s / 2);
            ctx.closePath();
            ctx.fill();
            break;
          }
          default: // square
            ctx.fillRect(x, y, s, s);
        }
      }
    }

    // Draw logo in center
    if (logoImage) {
      const logoSize = size * 0.22;
      const lx = (size - logoSize) / 2;
      const ly = (size - logoSize) / 2;
      const pad = 4;
      // White background behind logo
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      const rr = 8;
      ctx.moveTo(lx - pad + rr, ly - pad);
      ctx.lineTo(lx + logoSize + pad - rr, ly - pad);
      ctx.quadraticCurveTo(lx + logoSize + pad, ly - pad, lx + logoSize + pad, ly - pad + rr);
      ctx.lineTo(lx + logoSize + pad, ly + logoSize + pad - rr);
      ctx.quadraticCurveTo(lx + logoSize + pad, ly + logoSize + pad, lx + logoSize + pad - rr, ly + logoSize + pad);
      ctx.lineTo(lx - pad + rr, ly + logoSize + pad);
      ctx.quadraticCurveTo(lx - pad, ly + logoSize + pad, lx - pad, ly + logoSize + pad - rr);
      ctx.lineTo(lx - pad, ly - pad + rr);
      ctx.quadraticCurveTo(lx - pad, ly - pad, lx - pad + rr, ly - pad);
      ctx.closePath();
      ctx.fill();
      ctx.drawImage(logoImage, lx, ly, logoSize, logoSize);
    }

    // Draw frame label
    if (frameText) {
      const fy = size;
      ctx.fillStyle = fgFill;
      ctx.fillRect(0, fy, size, frameHeight);
      ctx.fillStyle = bgColor;
      ctx.font = 'bold ' + Math.round(frameHeight * 0.45) + 'px "Outfit", "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(frameText, size / 2, fy + frameHeight / 2);
    }

    // Show preview
    placeholder.style.display = 'none';
    canvas.style.display = 'block';
    actionsDiv.classList.remove('hidden');
    previewBox.classList.add('has-qr');
    JoogadTools.showToast('QR Code generated!', 'success');
  }

  // ===== GENERATE BUTTON =====
  generateBtn.addEventListener('click', () => {
    const data = buildQRData();
    if (data) renderQR(data);
  });

  // ===== DOWNLOAD HELPER =====
  async function saveFile(blob, filename) {
    if (window.showSaveFilePicker) {
      try {
        const ext = filename.split('.').pop();
        const mimeMap = { png: 'image/png', svg: 'image/svg+xml' };
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: ext.toUpperCase() + ' File', accept: { [mimeMap[ext] || 'application/octet-stream']: ['.' + ext] } }]
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        JoogadTools.showToast(filename + ' saved!', 'success');
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    JoogadTools.showToast(filename + ' downloaded!', 'success');
  }

  // Download PNG
  document.getElementById('btn-dl-png').addEventListener('click', () => {
    if (canvas.style.display === 'none') return;
    canvas.toBlob(b => { if (b) saveFile(b, 'joogadtools-qr.png'); }, 'image/png');
  });

  // ===== SVG GENERATION =====
  function generateSVG() {
    const model = qrInstance && qrInstance._oQRCode;
    if (!model || !model.modules) throw new Error('Generate QR first');
    const { modules, moduleCount } = model;
    const size = parseInt(document.getElementById('opt-size').value);
    const fgColor = document.getElementById('opt-fg').value;
    const bgColor = document.getElementById('opt-bg').value;
    const shape = document.getElementById('opt-shape').value;
    const useGradient = document.getElementById('opt-gradient').checked;
    const fgColor2 = document.getElementById('opt-fg2').value;
    const gradDir = document.getElementById('opt-grad-dir').value;
    const frameSel = document.getElementById('opt-frame').value;
    const frameCustom = document.getElementById('opt-frame-custom').value.trim();
    const frameTexts = { 'none': '', 'scan-me': 'SCAN ME', 'pay-here': 'PAY HERE', 'connect': 'CONNECT WIFI', 'visit': 'VISIT US', 'contact': 'SAVE CONTACT', 'custom': frameCustom };
    const frameText = frameTexts[frameSel] || '';
    const frameH = frameText ? 44 : 0;
    const totalH = size + frameH;
    const margin = 2;
    const total = moduleCount + margin * 2;
    const cell = size / total;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${totalH}" width="${size}" height="${totalH}" shape-rendering="crispEdges">\n`;

    // Gradient def
    if (useGradient) {
      const x2 = gradDir === 'vertical' ? '0' : '1';
      const y2 = gradDir === 'horizontal' ? '0' : '1';
      svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${fgColor}"/><stop offset="100%" stop-color="${fgColor2}"/></linearGradient></defs>\n`;
    }
    const fill = useGradient ? 'url(#g)' : fgColor;
    svg += `<rect width="${size}" height="${totalH}" fill="${bgColor}"/>\n`;

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!modules[r][c]) continue;
        const x = ((c + margin) * cell).toFixed(2);
        const y = ((r + margin) * cell).toFixed(2);
        const s = cell.toFixed(2);
        if (shape === 'dots') {
          const cx = ((c + margin) * cell + cell / 2).toFixed(2);
          const cy = ((r + margin) * cell + cell / 2).toFixed(2);
          const rad = (cell * 0.42).toFixed(2);
          svg += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/>\n`;
        } else if (shape === 'rounded') {
          const rx = (cell * 0.3).toFixed(2);
          svg += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}" fill="${fill}"/>\n`;
        } else if (shape === 'diamond') {
          const mx = ((c + margin) * cell + cell / 2).toFixed(2);
          const my = ((r + margin) * cell).toFixed(2);
          const bx = ((c + margin) * cell + cell).toFixed(2);
          const by = ((r + margin) * cell + cell / 2).toFixed(2);
          const ly = ((r + margin) * cell + cell).toFixed(2);
          const lx = ((c + margin) * cell).toFixed(2);
          svg += `<polygon points="${mx},${my} ${bx},${by} ${mx},${ly} ${lx},${by}" fill="${fill}"/>\n`;
        } else {
          svg += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${fill}"/>\n`;
        }
      }
    }

    // Frame
    if (frameText) {
      svg += `<rect x="0" y="${size}" width="${size}" height="${frameH}" fill="${fill}"/>\n`;
      const fs = Math.round(frameH * 0.45);
      svg += `<text x="${size / 2}" y="${size + frameH / 2}" fill="${bgColor}" font-size="${fs}" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${frameText}</text>\n`;
    }
    svg += '</svg>';
    return svg;
  }

  // Download SVG
  document.getElementById('btn-dl-svg').addEventListener('click', async () => {
    if (canvas.style.display === 'none') return;
    try {
      const svg = generateSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      await saveFile(blob, 'joogadtools-qr.svg');
    } catch (e) {
      JoogadTools.showToast('SVG error: ' + e.message, 'error');
    }
  });

  // Copy image
  document.getElementById('btn-copy').addEventListener('click', async () => {
    if (canvas.style.display === 'none') return;
    try {
      const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('fail')), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      JoogadTools.showToast('Copied!', 'success');
    } catch (e) { JoogadTools.showToast('Copy not supported in this browser', 'warning'); }
  });

  // ===== QR SCANNER =====
  let scannerStream = null;

  // Camera scanner
  document.getElementById('btn-scan-camera').addEventListener('click', async () => {
    const viewport = document.getElementById('scanner-viewport');
    const video = document.getElementById('scanner-video');
    try {
      scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = scannerStream;
      viewport.classList.remove('hidden');
      JoogadTools.showToast('Camera opened. Point at QR code.', 'info');
      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const scanLoop = async () => {
          if (!scannerStream) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              showScanResult(barcodes[0].rawValue);
              stopScanner();
              return;
            }
          } catch (e) { /* ignore */ }
          requestAnimationFrame(scanLoop);
        };
        video.onloadedmetadata = () => scanLoop();
      } else {
        JoogadTools.showToast('Live scan not supported. Use image upload.', 'warning');
      }
    } catch (e) {
      JoogadTools.showToast('Camera error: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-scan-stop').addEventListener('click', stopScanner);

  function stopScanner() {
    if (scannerStream) {
      scannerStream.getTracks().forEach(t => t.stop());
      scannerStream = null;
    }
    document.getElementById('scanner-viewport').classList.add('hidden');
  }

  // File scanner
  document.getElementById('scan-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        detector.detect(c).then(barcodes => {
          if (barcodes.length > 0) {
            showScanResult(barcodes[0].rawValue);
          } else {
            JoogadTools.showToast('No QR code found in image', 'warning');
          }
        }).catch(() => JoogadTools.showToast('Scan failed', 'error'));
      } else {
        JoogadTools.showToast('BarcodeDetector not supported in this browser. Use Chrome/Edge.', 'warning');
      }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  });

  function showScanResult(text) {
    const resDiv = document.getElementById('scanner-result');
    const resTxt = document.getElementById('scan-result-text');
    const resLink = document.getElementById('scan-result-link');
    resDiv.classList.remove('hidden');
    resTxt.textContent = text;
    // Check if URL
    try {
      new URL(text);
      resLink.href = text;
      resLink.style.display = 'inline-flex';
    } catch {
      resLink.style.display = 'none';
    }
    JoogadTools.showToast('QR code decoded!', 'success');
  }

  document.getElementById('btn-copy-scan').addEventListener('click', () => {
    const txt = document.getElementById('scan-result-text').textContent;
    if (txt) JoogadTools.copyToClipboard(txt);
  });

  // ===== BULK QR GENERATION =====
  document.getElementById('bulk-csv-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('bulk-input').value = ev.target.result;
      JoogadTools.showToast('CSV loaded!', 'info');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-bulk-generate').addEventListener('click', () => {
    const input = document.getElementById('bulk-input').value.trim();
    if (!input) { JoogadTools.showToast('Enter data for bulk generation', 'warning'); return; }
    const lines = input.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    if (lines.length > 100) { JoogadTools.showToast('Max 100 items allowed', 'warning'); return; }

    const grid = document.getElementById('bulk-grid');
    const results = document.getElementById('bulk-results');
    grid.innerHTML = '';
    results.classList.remove('hidden');

    const size = 200;
    const fgColor = document.getElementById('opt-fg').value;
    const bgColor = document.getElementById('opt-bg').value;

    lines.forEach((line, i) => {
      const div = document.createElement('div');
      div.className = 'bulk-item';
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      div.appendChild(c);
      const label = document.createElement('div');
      label.className = 'bulk-item-label';
      label.textContent = line.substring(0, 30);
      label.title = line;
      div.appendChild(label);
      grid.appendChild(div);

      // Generate QR into this canvas
      try {
        const tmpDiv = document.createElement('div');
        tmpDiv.style.cssText = 'position:absolute;left:-9999px;';
        document.body.appendChild(tmpDiv);
        const qr = new QRCode(tmpDiv, { text: line, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
        setTimeout(() => {
          const srcCanvas = tmpDiv.querySelector('canvas');
          if (srcCanvas) {
            const cx = c.getContext('2d');
            cx.drawImage(srcCanvas, 0, 0);
          }
          document.body.removeChild(tmpDiv);
        }, 100 + i * 50);
      } catch (e) { /* skip */ }

      // Click to download individual
      div.addEventListener('click', () => {
        c.toBlob(b => { if (b) saveFile(b, `qr-${i + 1}.png`); }, 'image/png');
      });
    });

    JoogadTools.showToast(`Generating ${lines.length} QR codes...`, 'info');
  });

  // ===== QR HISTORY (localStorage) =====
  const HISTORY_KEY = 'joogadtools_qr_history';

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }

  function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }

  function renderHistory() {
    const grid = document.getElementById('history-grid');
    const empty = document.getElementById('history-empty');
    const items = getHistory();

    if (items.length === 0) {
      grid.innerHTML = '';
      grid.appendChild(empty);
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = '';
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <img src="${item.image}" alt="QR">
        <div class="history-item-info" title="${item.data}">${item.type} — ${item.data.substring(0, 25)}</div>
        <button class="history-item-del" data-idx="${i}" title="Delete">✕</button>
      `;
      div.querySelector('img').addEventListener('click', () => {
        // Restore this QR data to input
        JoogadTools.showToast('QR data: ' + item.data.substring(0, 50), 'info');
      });
      div.querySelector('.history-item-del').addEventListener('click', (e) => {
        e.stopPropagation();
        const items = getHistory();
        items.splice(i, 1);
        saveHistory(items);
        renderHistory();
        JoogadTools.showToast('Deleted', 'info');
      });
      grid.appendChild(div);
    });
  }

  // Save to history
  document.getElementById('btn-save-history').addEventListener('click', () => {
    if (canvas.style.display === 'none') { JoogadTools.showToast('Generate QR first', 'warning'); return; }
    const items = getHistory();
    const imageData = canvas.toDataURL('image/png');
    items.unshift({
      data: lastQRData.substring(0, 200),
      type: qrType.options[qrType.selectedIndex].text.replace(/^[^\s]+\s/, ''),
      image: imageData,
      date: new Date().toLocaleDateString()
    });
    if (items.length > 20) items.pop(); // max 20
    saveHistory(items);
    renderHistory();
    JoogadTools.showToast('Saved to history!', 'success');
  });

  // Clear history
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    if (confirm('Clear all QR history?')) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
      JoogadTools.showToast('History cleared', 'info');
    }
  });

  // Initialize history on load
  renderHistory();

  // ===== ENTER KEY SHORTCUT =====
  document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && el.tagName !== 'TEXTAREA') {
        e.preventDefault();
        generateBtn.click();
      }
    });
  });
});
