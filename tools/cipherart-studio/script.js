/**
 * CipherArt Studio
 * Steganography Halftone Generator (SVG)
 */

const App = {
  // Config
  IMAGE_MAX_SIZE: 1200, // Max dimension to scale down large images for performance
  
  // Elements
  tabs: document.querySelectorAll('.tab-btn'),
  panels: document.querySelectorAll('.tab-panel'),
  
  // Create Tab Elements
  createDropzone: document.getElementById('create-dropzone'),
  createFileInput: document.getElementById('create-file'),
  createPreviewWrap: document.getElementById('create-preview-wrap'),
  createPreviewImg: document.getElementById('create-preview-img'),
  btnRemoveImg: document.getElementById('btn-remove-img'),
  createImgSize: document.getElementById('create-img-size'),
  
  msgInput: document.getElementById('create-message'),
  passInput: document.getElementById('create-password'),
  densitySlider: document.getElementById('density-slider'),
  densityVal: document.getElementById('density-val'),
  colorMode: document.getElementById('color-mode'),
  shapeTheme: document.getElementById('shape-theme'),
  customShapeWrap: document.getElementById('custom-shape-wrap'),
  shape0: document.getElementById('shape-0'),
  shape1: document.getElementById('shape-1'),
  animationStyle: document.getElementById('animation-style'),
  btnGenerate: document.getElementById('btn-generate'),
  
  capacityIndicator: document.getElementById('capacity-indicator'),
  capacityFill: document.getElementById('capacity-fill'),
  
  svgWrap: document.getElementById('svg-output-wrap'),
  canvasContainer: document.getElementById('canvas-container'),
  emptyState: document.querySelector('.empty-state'),
  btnDownload: document.getElementById('btn-download'),
  btnMagnifier: document.getElementById('btn-magnifier'),
  magnifierGlass: document.getElementById('magnifier-glass'),
  generateSuccess: document.getElementById('generate-success'),
  
  // Decode Tab Elements
  decodeDropzone: document.getElementById('decode-dropzone'),
  decodeFileInput: document.getElementById('decode-file'),
  decodeFileDisplay: document.getElementById('decode-file-display'),
  decodeFileName: document.getElementById('decode-file-name'),
  btnRemoveDecode: document.getElementById('btn-remove-decode'),
  decodePassInput: document.getElementById('decode-password'),
  btnDecode: document.getElementById('btn-decode'),
  decodeOutputWrap: document.getElementById('decode-output-wrap'),
  decodePlaceholder: document.getElementById('decode-placeholder'),
  decodeOutput: document.getElementById('decode-output'),
  decodeError: document.getElementById('decode-error'),
  
  // State
  currentImage: null, // HTMLImageElement
  imageGridCols: 0,
  imageGridRows: 0,
  maxCapacityBits: 0,
  generatedSVGString: '',
  decodeSVGString: '',

  init() {
    this.bindTabs();
    this.bindCreateEvents();
    this.bindDecodeEvents();
    this.updateCapacity();
  },
  
  bindTabs() {
    this.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabs.forEach(b => b.classList.remove('active'));
        this.panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });
    // Password toggles
    document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🙈';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      });
    });
  },

  // ===== TAB 1: CREATE ART =====

  bindCreateEvents() {
    // Dropzone
    this.createDropzone.addEventListener('click', () => this.createFileInput.click());
    this.createDropzone.addEventListener('dragover', (e) => { e.preventDefault(); this.createDropzone.classList.add('drag-over'); });
    this.createDropzone.addEventListener('dragleave', () => this.createDropzone.classList.remove('drag-over'));
    this.createDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.createDropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleImageUpload(e.dataTransfer.files[0]);
    });
    this.createFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleImageUpload(e.target.files[0]);
    });
    this.btnRemoveImg.addEventListener('click', () => this.removeImage());

    // Dynamics
    this.shapeTheme.addEventListener('change', () => {
      this.customShapeWrap.style.display = this.shapeTheme.value === 'custom' ? 'block' : 'none';
    });

    this.densitySlider.addEventListener('input', () => {
      const val = parseInt(this.densitySlider.value);
      this.densityVal.textContent = val + 'px';
      this.updateGridMeasurements();
    });
    this.msgInput.addEventListener('input', () => this.updateCapacity());

    // Action
    this.btnGenerate.addEventListener('click', () => this.generateArt());
    this.btnDownload.addEventListener('click', () => this.downloadSVG());
    this.btnMagnifier.addEventListener('click', () => this.toggleMagnifier());
    this.bindMagnifierEvents();
  },

  handleImageUpload(file) {
    if (!file.type.startsWith('image/')) return alert('Please upload an image file.');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.createPreviewImg.src = url;
      this.createImgSize.textContent = `${img.width} × ${img.height} px`;
      this.createDropzone.classList.add('hidden');
      this.createPreviewWrap.classList.remove('hidden');
      this.updateGridMeasurements();
    };
    img.src = url;
  },

  removeImage() {
    this.createFileInput.value = '';
    this.currentImage = null;
    this.createPreviewImg.src = '';
    this.createPreviewWrap.classList.add('hidden');
    this.createDropzone.classList.remove('hidden');
    this.updateGridMeasurements();
    
    // Reset output
    this.svgWrap.innerHTML = '';
    this.svgWrap.style.display = 'none';
    this.emptyState.style.display = 'block';
    this.btnDownload.disabled = true;
    this.btnMagnifier.disabled = true;
    this.btnMagnifier.classList.add('hidden');
    if(this.isMagnifierActive) this.toggleMagnifier(); // reset lens
    this.generateSuccess.classList.add('hidden');
  },

  updateGridMeasurements() {
    if (!this.currentImage) {
      this.maxCapacityBits = 0;
      this.updateCapacity();
      return;
    }
    const cellSize = parseInt(this.densitySlider.value);
    
    // Calculate scaled dimensions to avoid freezing on 4K images with 4px grid
    let w = this.currentImage.width;
    let h = this.currentImage.height;
    if (Math.max(w, h) > this.IMAGE_MAX_SIZE) {
      const ratio = this.IMAGE_MAX_SIZE / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    this.imageGridCols = Math.floor(w / cellSize);
    this.imageGridRows = Math.floor(h / cellSize);
    
    // Every cell holds 1 bit. Total characters = total cells / 8.
    const totalCells = this.imageGridCols * this.imageGridRows;
    this.maxCapacityBits = totalCells;
    
    this.updateCapacity();
  },

  updateCapacity() {
    const rawMsg = this.msgInput.value;
    
    // Encryption overhead: AES adds padding, IV, etc. Roughly 1.5x to 2x larger in Base64 string length.
    // For capacity, let's treat the final Base64 string. 1 character = 8 bits.
    // Let's do a mock encryption to get exact bits.
    let requiredBits = 0;
    if (rawMsg) {
      const pw = this.passInput.value || 'test'; // temporary
      // AES encryption produces base64 string
      const ciphertext = CryptoJS.AES.encrypt(rawMsg, pw).toString();
      requiredBits = ciphertext.length * 8; 
    }

    const maxChars = Math.floor(this.maxCapacityBits / 8); 
    const reqChars = requiredBits / 8;

    this.capacityIndicator.textContent = `Capacity: ${reqChars}/${maxChars} blocks`;
    
    let percent = maxChars > 0 ? (reqChars / maxChars) * 100 : 0;
    
    this.capacityFill.style.width = Math.min(100, percent) + '%';
    
    if (percent > 100) {
      this.capacityFill.classList.add('capacity-over');
      this.capacityIndicator.style.color = 'var(--danger)';
    } else {
      this.capacityFill.classList.remove('capacity-over');
      this.capacityIndicator.style.color = '';
    }
  },

  async generateArt() {
    if (!this.currentImage) return alert('Please upload an image first.');
    const msg = this.msgInput.value.trim();
    if (!msg) return alert('Please enter a secret message to hide.');
    const pw = this.passInput.value;
    if (!pw) return alert('Please provide an encryption password.');

    // 1. Encrypt Message
    const ciphertext = CryptoJS.AES.encrypt(msg, pw).toString();
    const binaryData = this.stringToBinary(ciphertext);

    if (binaryData.length > this.maxCapacityBits) {
      return alert('Message is too long for this grid density. Reduce message length or decrease Grid Detail to increase cells.');
    }

    this.btnGenerate.innerHTML = '⏳ Generating...';
    this.btnGenerate.disabled = true;

    // Yield control to UI
    await new Promise(r => setTimeout(r, 50));

    try {
      const cellSize = parseInt(this.densitySlider.value);
      const mode = this.colorMode.value;
      const theme = this.shapeTheme.value;
      const animStyle = this.animationStyle.value;

      // Draw onto hidden canvas to extract pixel data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = this.imageGridCols * cellSize;
      canvas.height = this.imageGridRows * cellSize;
      ctx.drawImage(this.currentImage, 0, 0, canvas.width, canvas.height);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      // Determine Text Modes
      let char0 = '';
      let char1 = '';
      if (theme === 'custom') {
          char0 = this.shape0.value || '0';
          char1 = this.shape1.value || '1';
      } else if (theme === 'matrix') {
          char0 = '0';
          char1 = '1';
      } else if (theme === 'minimal') {
          char0 = '-';
          char1 = '+';
      }
      const isTextMode = theme !== 'classic';

      // Start Building SVG efficiently
      let svgParts = [];
      svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%" data-stealth="${binaryData}">`);
      
      // Add Animation Styles
      if (animStyle !== 'none') {
        let styleBlock = '<style>';
        if (animStyle === 'matrix_rain') {
          styleBlock += `.anim-rain { opacity: 0; animation: rain 2.5s infinite linear; } @keyframes rain { 0% { opacity: 0; transform: translateY(-3px); } 5% { opacity: 1; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(3px); } }`;
        } else if (animStyle === 'cyber_glitch') {
          styleBlock += `.anim-glitch { animation: glitch 4s infinite steps(1); } @keyframes glitch { 0% { transform: translate(0); } 2% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); } 4% { transform: translate(2px, -1px); filter: hue-rotate(-90deg); } 6% { transform: translate(0); } }`;
        } else if (animStyle === 'pulse') {
          styleBlock += `.anim-pulse { animation: pulse 4s infinite ease-in-out; transform-origin: center; transform-box: fill-box; } @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }`;
        } else if (animStyle === 'hue_shift') {
          styleBlock += `.anim-hue { animation: hue 10s infinite linear; } @keyframes hue { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }`;
        } else if (animStyle === 'hover_flashlight') {
          styleBlock += `.anim-flashlight { opacity: 0.05; transition: opacity 0.3s ease, transform 0.3s ease; transform-origin: center; transform-box: fill-box; pointer-events: bounding-box; cursor: crosshair; } .anim-flashlight:hover { opacity: 1; transform: scale(1.5); }`;
        }
        styleBlock += '</style>';
        svgParts.push(styleBlock);
      }

      // Background (Dark)
      svgParts.push(`<rect width="${canvas.width}" height="${canvas.height}" fill="${mode === 'monochrome' ? '#ffffff' : '#0c0c0c'}" />`);

      let bitIndex = 0;
      
      // Loop over grid cells
      for (let y = 0; y < this.imageGridRows; y++) {
        // Yield control to the browser every 20 rows to prevent UI freezing
        if (y % 20 === 0) {
           await new Promise(r => setTimeout(r, 0));
        }

        for (let x = 0; x < this.imageGridCols; x++) {
          
          const pxX = x * cellSize + Math.floor(cellSize/2);
          const pxY = y * cellSize + Math.floor(cellSize/2);
          
          // Get average color of this cell (simplified to center pixel for speed, or sample a few)
          const i = (pxY * canvas.width + pxX) * 4;
          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          
          // Calculate Luminance (0 to 255)
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          
          // Map luminance to stroke width (max thickness mostly fills cell)
          // For Dark mode: lighter pixels = thicker shapes.
          // For Monochrome (White bg): darker pixels = thicker shapes.
          let thickness = 0;
          if (mode === 'monochrome') {
            // White background, black shapes. Dark pixel = thick black stroke.
            thickness = ((255 - luminance) / 255) * (cellSize * 0.6);
          } else {
            // Dark background. Light pixel = thick stroke.
            thickness = (luminance / 255) * (cellSize * 0.6);
          }
          
          // Don't draw if thickness is effectively invisible
          if (thickness < 0.5) continue;
          
          // Determine Color
          let color = '#ffffff';
          if (mode === 'monochrome') color = '#000000';
          else if (mode === 'neon') color = '#00ff41'; // Matrix green
          else if (mode === 'original') color = `rgb(${r},${g},${b})`;

          // Determine Shape based on Bits
          // If we run out of bits, pad with random noise visually
          let bit = '0';
          if (bitIndex < binaryData.length) {
            bit = binaryData[bitIndex];
            bitIndex++;
          } else {
            bit = Math.random() > 0.5 ? '1' : '0'; // Random padding
          }

          const cx = x * cellSize;
          const cy = y * cellSize;

          // Animations Config
          let animClass = '';
          let animDelay = '';
          if (animStyle === 'matrix_rain') {
             animClass = 'anim-rain';
             animDelay = `animation-delay: ${(y * 0.04) + (Math.random() * 0.4)}s;`;
          } else if (animStyle === 'cyber_glitch') {
             // Only glitch a random 20% of shapes to avoid seizure UI
             animClass = Math.random() > 0.8 ? 'anim-glitch' : '';
             animDelay = `animation-delay: ${Math.random() * 5}s;`;
          } else if (animStyle === 'pulse') {
             animClass = 'anim-pulse';
             animDelay = `animation-delay: ${Math.random() * 4}s;`;
          } else if (animStyle === 'hue_shift') {
             animClass = 'anim-hue';
          } else if (animStyle === 'hover_flashlight') {
             animClass = 'anim-flashlight';
          }

          if (isTextMode) {
             const charToDraw = bit === '0' ? char0 : char1;
             // FontSize is determined by thickness (luminance)
             // Default thickness mapping is 0-cellSize*0.6, so we map up to a reasonable font size
             let fontSize = Math.max(cellSize * 0.4, (thickness / (cellSize * 0.6)) * (cellSize * 1.2));
             if (fontSize < cellSize * 0.2) continue; // skip too tiny elements entirely
             
             svgParts.push(`<text x="${cx + cellSize/2}" y="${cy + cellSize/2}" font-family="monospace, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${color}" text-anchor="middle" dominant-baseline="central" class="${animClass}" style="${animDelay}">${charToDraw}</text>`);
          } else {
            if (bit === '0') {
              // CROSS (X)
              const margin = cellSize * 0.15;
              svgParts.push(`<path d="M${cx+margin},${cy+margin} L${cx+cellSize-margin},${cy+cellSize-margin} M${cx+cellSize-margin},${cy+margin} L${cx+margin},${cy+cellSize-margin}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" fill="none" class="${animClass}" style="${animDelay}" />`);
            } else {
              // CIRCLE (O)
              const radius = (cellSize / 2) - (cellSize * 0.15);
              svgParts.push(`<circle cx="${cx + cellSize/2}" cy="${cy + cellSize/2}" r="${radius}" stroke="${color}" stroke-width="${thickness}" fill="none" class="${animClass}" style="${animDelay}" />`);
            }
          }
        }
      }

      svgParts.push(`</svg>`);
      this.generatedSVGString = svgParts.join('');

      // Render
      this.emptyState.style.display = 'none';
      this.svgWrap.innerHTML = this.generatedSVGString;
      this.svgWrap.style.display = 'block';
      this.btnDownload.disabled = false;
      this.btnMagnifier.disabled = false;
      this.btnMagnifier.classList.remove('hidden');
      this.generateSuccess.classList.remove('hidden');

    } catch (err) {
      alert('Error generating art: ' + err.message);
      console.error(err);
    } finally {
      this.btnGenerate.innerHTML = '✨ Generate CipherArt';
      this.btnGenerate.disabled = false;
    }
  },

  downloadSVG() {
    if (!this.generatedSVGString) return;
    const blob = new Blob([this.generatedSVGString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cipherart_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ===== MAGNIFIER LOGIC =====
  isMagnifierActive: false,

  toggleMagnifier() {
    this.isMagnifierActive = !this.isMagnifierActive;
    if (this.isMagnifierActive) {
       this.btnMagnifier.classList.add('btn-accent');
       this.btnMagnifier.classList.remove('btn-outline');
       this.svgWrap.style.cursor = 'crosshair';
       // Clone SVG content directly inside glass
       this.magnifierGlass.innerHTML = this.generatedSVGString;
    } else {
       this.btnMagnifier.classList.remove('btn-accent');
       this.btnMagnifier.classList.add('btn-outline');
       this.svgWrap.style.cursor = 'default';
       this.magnifierGlass.classList.add('hidden');
       this.magnifierGlass.innerHTML = '';
    }
  },

  bindMagnifierEvents() {
     this.svgWrap.addEventListener('mousemove', (e) => {
        if (!this.isMagnifierActive) return;
        
        this.magnifierGlass.classList.remove('hidden');

        const rect = this.svgWrap.getBoundingClientRect();
        
        // Use e.clientX direct for absolute mouse location over container
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.magnifierGlass.style.left = mouseX + 'px';
        this.magnifierGlass.style.top = mouseY + 'px';

        // Calculate scroll offsets to perfectly sync the transform origin
        const scrollX = this.svgWrap.scrollLeft + mouseX;
        const scrollY = this.svgWrap.scrollTop + mouseY;
        
        // This calculates the % X/Y inside the SVG 
        const percentX = (scrollX / this.svgWrap.scrollWidth) * 100;
        const percentY = (scrollY / this.svgWrap.scrollHeight) * 100;

        const innerSvg = this.magnifierGlass.querySelector('svg');
        if (innerSvg) {
           innerSvg.style.transformOrigin = `${percentX}% ${percentY}%`;
        }
     });

     this.svgWrap.addEventListener('mouseleave', () => {
        if (!this.isMagnifierActive) return;
        this.magnifierGlass.classList.add('hidden');
     });
  },

  // ===== BINARY UTILS =====
  stringToBinary(str) {
    let output = '';
    for (let i = 0; i < str.length; i++) {
        const bin = str.charCodeAt(i).toString(2);
        output += bin.padStart(8, '0');
    }
    return output;
  },

  binaryToString(bin) {
    let str = '';
    for (let i = 0; i < bin.length; i += 8) {
        const byte = bin.slice(i, i + 8);
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
  },

  // ===== TAB 2: DECODE =====

  bindDecodeEvents() {
    this.decodeDropzone.addEventListener('click', () => this.decodeFileInput.click());
    this.decodeDropzone.addEventListener('dragover', (e) => { e.preventDefault(); this.decodeDropzone.classList.add('drag-over'); });
    this.decodeDropzone.addEventListener('dragleave', () => this.decodeDropzone.classList.remove('drag-over'));
    this.decodeDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.decodeDropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) this.handleDecodeUpload(e.dataTransfer.files[0]);
    });
    this.decodeFileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleDecodeUpload(e.target.files[0]);
    });
    this.btnRemoveDecode.addEventListener('click', () => {
      this.decodeFileInput.value = '';
      this.decodeSVGString = '';
      this.decodeFileDisplay.classList.add('hidden');
      this.decodeDropzone.classList.remove('hidden');
      this.decodeOutput.classList.add('hidden');
      this.decodePlaceholder.classList.remove('hidden');
      this.decodeError.classList.add('hidden');
    });

    this.btnDecode.addEventListener('click', () => this.decodeArt());
  },

  handleDecodeUpload(file) {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      return alert('Invalid file format. Please upload a .svg file generated by CipherArt.');
    }
    
    // Read SVG as text
    const reader = new FileReader();
    reader.onload = (e) => {
      this.decodeSVGString = e.target.result;
      this.decodeFileName.textContent = file.name;
      this.decodeDropzone.classList.add('hidden');
      this.decodeFileDisplay.classList.remove('hidden');
    };
    reader.readAsText(file);
  },

  decodeArt() {
    this.decodeError.classList.add('hidden');
    
    if (!this.decodeSVGString) return alert('Please upload an SVG file first.');
    const pw = this.decodePassInput.value;
    if (!pw) return alert('Please enter the decryption password.');

    // Parse SVG looking for data-stealth attribute
    // Example: <svg ... data-stealth="0101010101">
    
    // Safety matching regex for the attribute
    const match = this.decodeSVGString.match(/data-stealth="([01]+)"/);
    if (!match || !match[1]) {
       this.showDecodeError('No Steganographic data found. This SVG was not generated by CipherArt Studio or has been stripped of metadata.');
       return;
    }

    const binaryData = match[1];

    try {
      const ciphertext = this.binaryToString(binaryData);
      
      const decrypted = CryptoJS.AES.decrypt(ciphertext, pw);
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        throw new Error('Malformed UTF8 (Wrong password)');
      }

      // Success
      this.decodePlaceholder.classList.add('hidden');
      this.decodeOutput.textContent = plaintext;
      this.decodeOutput.classList.remove('hidden');
      document.getElementById('btn-copy-decrypted').classList.remove('hidden');

    } catch (err) {
      this.showDecodeError('Decryption failed. Incorrect password or corrupted data.');
    }
  },

  showDecodeError(msg) {
    this.decodeError.textContent = '❌ ' + msg;
    this.decodeError.classList.remove('hidden');
    this.decodeOutput.classList.add('hidden');
    this.decodePlaceholder.classList.remove('hidden');
    document.getElementById('btn-copy-decrypted').classList.add('hidden');
  }

};

// Add copy support for decoded text
document.getElementById('btn-copy-decrypted').addEventListener('click', function() {
  const text = document.getElementById('decode-output').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = this;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
