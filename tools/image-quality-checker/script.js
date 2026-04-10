/// <reference path="../../js/common.d.ts" />
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadSection = document.getElementById('upload-section');
  const loadingState = document.getElementById('loading-state');
  const resultsDashboard = document.getElementById('results-dashboard');
  const resetBtn = document.getElementById('reset-btn');
  const previewImg = document.getElementById('preview-img');

  // Basic Info Elements
  const elFileName = document.getElementById('file-name');
  const elFileSize = document.getElementById('file-size');
  const elDimensions = document.getElementById('dimensions');
  const elAspectRatio = document.getElementById('aspect-ratio');
  const elResolutionBadge = document.getElementById('resolution-badge');
  const elOptWarning = document.getElementById('optimization-warning');

  // Metrics
  const sharpnessFill = document.getElementById('sharpness-fill');
  const sharpnessText = document.getElementById('sharpness-text');
  const printText = document.getElementById('print-text');
  const lightingText = document.getElementById('lighting-text');
  const alphaText = document.getElementById('alpha-text');
  
  // Lists
  const socialChecklist = document.getElementById('social-checklist');
  const paletteSwatches = document.getElementById('palette-swatches');
  const exifSection = document.getElementById('exif-section');
  const exifTableBody = document.getElementById('exif-table-body');
  const gpsInfo = document.getElementById('gps-info');
  const mapsLink = document.getElementById('maps-link');

  let currentFile = null;

  // --- Event Listeners ---
  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  resetBtn.addEventListener('click', () => {
    resultsDashboard.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
    currentFile = null;
    exifSection.classList.add('hidden');
    gpsInfo.classList.add('hidden');
  });

  // --- Main Handlers ---
  function handleFile(file) {
    if (!file.type.match('image.*')) {
      JoogadTools.showToast('Please upload a valid image file.', 'error');
      return;
    }
    
    // Check max size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      JoogadTools.showToast('File too large. Maximum 50MB.', 'error');
      return;
    }

    currentFile = file;
    uploadSection.classList.add('hidden');
    loadingState.classList.remove('hidden');

    // Create object URL
    const objUrl = URL.createObjectURL(file);
    previewImg.onload = () => {
      // Small delay to allow UI to render spinner
      setTimeout(() => processImage(previewImg), 100);
    };
    previewImg.src = objUrl;
  }

  async function processImage(img) {
    try {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const sizeBytes = currentFile.size;

      // 1. Basic Properties
      elFileName.textContent = currentFile.name;
      elFileSize.textContent = formatBytes(sizeBytes);
      elDimensions.textContent = `${width} × ${height} px`;
      
      const gcd = getGCD(width, height);
      elAspectRatio.textContent = `${width/gcd}:${height/gcd} (${(width/height).toFixed(2)})`;

      // 2. Resolution Tagging
      const totalPixels = width * height;
      let resText = 'Low-Res';
      let resColor = 'var(--text-secondary)';
      
      if (totalPixels >= 3840 * 2160) { resText = '4K+ Ultra HD'; resColor = 'var(--purple)'; }
      else if (totalPixels >= 2560 * 1440) { resText = '2K (1440p)'; resColor = 'var(--blue)'; }
      else if (totalPixels >= 1920 * 1080) { resText = 'Full HD (1080p)'; resColor = 'var(--success-color)'; }
      else if (totalPixels >= 1280 * 720) { resText = 'HD (720p)'; resColor = 'var(--teal)'; }
      
      elResolutionBadge.textContent = resText;
      elResolutionBadge.style.background = `linear-gradient(135deg, ${resColor}, #222)`;

      // Optimization Check
      let bpp = sizeBytes / totalPixels; // Bytes per pixel
      // If BPP is high, or size > 2MB and not a massive image
      if (sizeBytes > 2 * 1024 * 1024 && bpp > 0.5) {
        elOptWarning.classList.remove('hidden');
      } else {
        elOptWarning.classList.add('hidden');
      }

      // 3. Print Suitability
      // A4 at 300 DPI is approx 2480 x 3508
      const maxDim = Math.max(width, height);
      const minDim = Math.min(width, height);
      if (maxDim >= 3508 && minDim >= 2480) {
        printText.textContent = 'Excellent for A4 Print';
        printText.style.color = 'var(--success-color)';
      } else if (maxDim >= 1754 && minDim >= 1240) {
        printText.textContent = 'Good for A5 Print / OK for A4';
        printText.style.color = 'var(--warning-color)';
      } else {
        printText.textContent = 'Web Use Only (< 150 DPI for A4)';
        printText.style.color = 'var(--error-color)';
      }

      // 4. Social Media Readiness
      processSocialMedia(width, height);

      // 5. Canvas Analysis (Sharpness, Alpha, Exposure)
      await analyzeCanvasPixels(img);

      // 6. Dominant Colors
      processColors(img);

      // 7. EXIF Data
      await processExif(currentFile);

      // Show Results
      loadingState.classList.add('hidden');
      resultsDashboard.classList.remove('hidden');

    } catch (err) {
      console.error(err);
      JoogadTools.showToast('Error analyzing image.', 'error');
      loadingState.classList.add('hidden');
      uploadSection.classList.remove('hidden');
    }
  }

  // --- Canvas Pixel Analysis ---
  function analyzeCanvasPixels(img) {
    return new Promise((resolve) => {
      // Scale down image for performance during pixel analysis
      const MAX_SIZE = 800;
      let scale = 1;
      if (img.naturalWidth > MAX_SIZE || img.naturalHeight > MAX_SIZE) {
        scale = Math.min(MAX_SIZE / img.naturalWidth, MAX_SIZE / img.naturalHeight);
      }
      const cvsWidth = Math.floor(img.naturalWidth * scale);
      const cvsHeight = Math.floor(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = cvsWidth;
      canvas.height = cvsHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cvsWidth, cvsHeight);

      const imageData = ctx.getImageData(0, 0, cvsWidth, cvsHeight);
      const data = imageData.data;

      let totalAlpha = 0;
      let hasTransparency = false;
      let totalLuma = 0;
      
      // Calculate grayscale for laplacian and do alpha/exposure pass
      const grayData = new Uint8Array(cvsWidth * cvsHeight);

      for (let i = 0, j=0; i < data.length; i += 4, j++) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        if (a < 250) hasTransparency = true;
        
        // Luminance
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;
        grayData[j] = luma;
      }

      // Exposure Result
      const avgLuma = totalLuma / (cvsWidth * cvsHeight);
      if (avgLuma < 50) {
        lightingText.textContent = 'Underexposed (Too Dark)';
        lightingText.style.color = 'var(--error-color)';
      } else if (avgLuma > 200) {
        lightingText.textContent = 'Overexposed (Too Bright)';
        lightingText.style.color = 'var(--warning-color)';
      } else {
        lightingText.textContent = 'Balanced Exposure';
        lightingText.style.color = 'var(--success-color)';
      }

      // Alpha Result
      if (hasTransparency) {
        alphaText.textContent = 'True Transparency 🟩';
        alphaText.style.color = 'var(--success-color)';
      } else {
        alphaText.textContent = 'Solid Background 🟥';
        alphaText.style.color = 'var(--text-secondary)';
      }

      // Laplacian Variance (Sharpness)
      const variance = calculateLaplacianVariance(grayData, cvsWidth, cvsHeight);
      
      // Map variance to a 0-100 score (rough heuristic)
      let score = Math.min(100, Math.max(0, (variance - 50) / 10)); // Normalize
      
      sharpnessFill.style.width = scroll + '%'; // Reset
      setTimeout(() => {
        sharpnessFill.style.width = score + '%';
        if (score < 40) {
          sharpnessFill.style.background = 'var(--error-color)';
          sharpnessText.textContent = 'Blurry / Soft';
        } else if (score < 70) {
          sharpnessFill.style.background = 'var(--warning-color)';
          sharpnessText.textContent = 'Acceptable Sharpness';
        } else {
          sharpnessFill.style.background = 'var(--success-color)';
          sharpnessText.textContent = 'Crisp & Sharp';
        }
      }, 100);

      resolve();
    });
  }

  function calculateLaplacianVariance(gray, width, height) {
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    // Standard 3x3 Laplacian kernel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        const laplacian = 
          gray[i - width] + 
          gray[i - 1] - 4 * gray[i] + gray[i + 1] + 
          gray[i + width];
        
        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }
    
    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    return variance;
  }

  // --- Process Social Media ---
  function processSocialMedia(width, height) {
    const ratio = width / height;
    socialChecklist.innerHTML = '';

    const rules = [
      { name: 'Insta Square (1:1)', minW: 1080, target: 1 },
      { name: 'Insta Portrait (4:5)', minW: 1080, target: 0.8 },
      { name: 'Insta/FB Story (9:16)', minW: 1080, target: 0.5625 },
      { name: 'YouTube Thumbnail (16:9)', minW: 1280, target: 1.7778 }
    ];

    rules.forEach(rule => {
      // Allow 5% tolerance in aspect ratio
      const isRatioOk = Math.abs(ratio - rule.target) / rule.target < 0.05;
      const isResOk = width >= rule.minW;
      
      const pass = isRatioOk && isResOk;
      
      const div = document.createElement('div');
      div.className = 'social-item';
      div.innerHTML = `
        <span class="status" style="color: ${pass ? 'var(--success-color)' : 'var(--error-color)'}">${pass ? '✅' : '❌'}</span>
        <span>${rule.name}</span>
      `;
      socialChecklist.appendChild(div);
    });
  }

  // --- Process Colors ---
  function processColors(img) {
    paletteSwatches.innerHTML = '';
    try {
      const colorThief = new ColorThief();
      // Wait for image to be fully decoded if not already
      if (img.complete) {
        const palette = colorThief.getPalette(img, 5);
        palette.forEach(rgb => {
          const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
          const wrapper = document.createElement('div');
          wrapper.className = 'color-swatch-wrapper';
          wrapper.innerHTML = `
            <div class="color-swatch" style="background-color: ${hex}" onclick="JoogadTools.copyToClipboard('${hex}')" title="Click to copy"></div>
            <span class="color-hex">${hex}</span>
          `;
          paletteSwatches.appendChild(wrapper);
        });
      }
    } catch (e) {
      console.log('ColorThief failed or unsupported image');
      paletteSwatches.innerHTML = '<span class="text-secondary">Unable to extract colors (maybe SVG or missing CORS).</span>';
    }
  }

  // --- Process EXIF ---
  async function processExif(file) {
    exifSection.classList.add('hidden');
    gpsInfo.classList.add('hidden');
    exifTableBody.innerHTML = '';

    try {
      if (!window.exifr) return;
      
      const exifData = await exifr.parse(file, true);
      
      if (exifData) {
        exifSection.classList.remove('hidden');
        
        const tagsToShow = [
          { key: 'Make', label: 'Camera Make' },
          { key: 'Model', label: 'Camera Model' },
          { key: 'Software', label: 'Software' },
          { key: 'DateTimeOriginal', label: 'Date/Time' },
          { key: 'ExposureTime', label: 'Exposure Time', format: v => `1/${Math.round(1/v)}s` },
          { key: 'FNumber', label: 'Aperture', format: v => `f/${v}` },
          { key: 'ISO', label: 'ISO' },
          { key: 'FocalLength', label: 'Focal Length', format: v => `${v}mm` }
        ];

        let hasData = false;
        tagsToShow.forEach(tag => {
          if (exifData[tag.key]) {
            hasData = true;
            let val = exifData[tag.key];
            if (tag.format) val = tag.format(val);
            if (val instanceof Date) val = val.toLocaleString();
            
            exifTableBody.innerHTML += `
              <tr>
                <td>${tag.label}</td>
                <td>${val}</td>
              </tr>
            `;
          }
        });

        if (!hasData) {
          exifTableBody.innerHTML += `<tr><td colspan="2" class="text-center">Basic metadata found, but no specific camera details.</td></tr>`;
        }

        // GPS Check
        if (exifData.latitude && exifData.longitude) {
          gpsInfo.classList.remove('hidden');
          mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${exifData.latitude},${exifData.longitude}`;
        }
      }
    } catch (e) {
      console.log('No EXIF data found or unsupported format.');
    }
  }

  // --- Utils ---
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function getGCD(a, b) {
    return b === 0 ? a : getGCD(b, a % b);
  }

  function componentToHex(c) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
});
