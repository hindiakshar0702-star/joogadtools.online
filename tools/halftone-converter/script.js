/**
 * Halftone Shape Converter
 * Steganography-free Halftone Generator (SVG)
 */

const App = {
  // Config
  IMAGE_MAX_SIZE: 1200, // Max dimension to scale down large images for performance
  
  // Elements
  createDropzone: document.getElementById('create-dropzone'),
  createFileInput: document.getElementById('create-file'),
  createPreviewWrap: document.getElementById('create-preview-wrap'),
  createPreviewImg: document.getElementById('create-preview-img'),
  btnRemoveImg: document.getElementById('btn-remove-img'),
  createImgSize: document.getElementById('create-img-size'),
  
  densitySlider: document.getElementById('density-slider'),
  densityVal: document.getElementById('density-val'),
  colorMode: document.getElementById('color-mode'),
  shapeTheme: document.getElementById('shape-theme'),
  gridDistortion: document.getElementById('grid-distortion'),
  customShapeWrap: document.getElementById('custom-shape-wrap'),
  shape0: document.getElementById('shape-0'),
  shape1: document.getElementById('shape-1'),
  btnGenerate: document.getElementById('btn-generate'),
  
  svgWrap: document.getElementById('svg-output-wrap'),
  canvasContainer: document.getElementById('canvas-container'),
  emptyState: document.querySelector('.empty-state'),
  btnDownload: document.getElementById('btn-download'),
  btnMagnifier: document.getElementById('btn-magnifier'),
  magnifierGlass: document.getElementById('magnifier-glass'),
  generateSuccess: document.getElementById('generate-success'),
  
  // State
  currentImage: null, // HTMLImageElement
  imageGridCols: 0,
  imageGridRows: 0,
  generatedSVGString: '',

  init() {
    this.bindEvents();
  },
  
  lerpColor(a, b, amount) { 
        const ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);
        return '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1);
  },
  
  rgbToCmyk(r, g, b) {
      if (r === 0 && g === 0 && b === 0) return {c:0, m:0, y:0, k:1};
      let c = 1 - (r / 255);
      let m = 1 - (g / 255);
      let y = 1 - (b / 255);
      let k = Math.min(c, m, y);
      c = (c - k) / (1 - k);
      m = (m - k) / (1 - k);
      y = (y - k) / (1 - k);
      return {c, m, y, k};
  },
  
  bindEvents() {
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
    if (!this.currentImage) return;
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
  },

  async generateArt() {
    if (!this.currentImage) return alert('Please upload an image first.');

    this.btnGenerate.innerHTML = '⏳ Generating...';
    this.btnGenerate.disabled = true;

    // Yield control to UI
    await new Promise(r => setTimeout(r, 50));

    try {
      const cellSize = parseInt(this.densitySlider.value);
      const mode = this.colorMode.value;
      const theme = this.shapeTheme.value;
      const distortion = this.gridDistortion.value;

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
      }
      const isTextMode = theme === 'custom' || theme === 'matrix' || theme === 'minimal' || theme === 'ascii';
      const isAscii = theme === 'ascii';
      const asciiChars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];

      // Start Building SVG efficiently
      let svgParts = [];
      let bgColor = '#0c0c0c';
      if (mode === 'monochrome' || mode === 'cmyk') bgColor = '#ffffff';
      
      svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%" style="background-color: ${bgColor}">`);
      
      // Loop over grid cells
      for (let y = 0; y < this.imageGridRows; y++) {
        // Yield control to the browser every 20 rows to prevent UI freezing
        if (y % 20 === 0) {
           await new Promise(r => setTimeout(r, 0));
        }

        for (let x = 0; x < this.imageGridCols; x++) {
          
          let pxX = x * cellSize + Math.floor(cellSize/2);
          let pxY = y * cellSize + Math.floor(cellSize/2);
          
          // Get average color of this cell (simplified to center pixel for speed, or sample a few)
          let i = (pxY * canvas.width + pxX) * 4;
          // bounds check to avoid index out of range on warp
          if (i >= imgData.length) i = imgData.length - 4;

          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          
          // Calculate Luminance (0 to 255)
          const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          let cx = x * cellSize;
          let cy = y * cellSize;

          // Apply Grid Distortion
          if (distortion === 'wave') {
             cx += Math.sin((cy / canvas.height) * Math.PI * 4) * (cellSize * 1.5);
             cy += Math.cos((cx / canvas.width) * Math.PI * 4) * (cellSize * 1.5);
          } else if (distortion === 'fisheye') {
             const centerX = canvas.width / 2;
             const centerY = canvas.height / 2;
             const dx = cx - centerX;
             const dy = cy - centerY;
             const dist = Math.sqrt(dx*dx + dy*dy);
             const maxDist = Math.sqrt(centerX*centerX + centerY*centerY);
             // Fisheye warp factor: squeeze center, expand edges (or vice-versa)
             const factor = 1 + (dist / maxDist) * 0.8;
             cx = centerX + dx * factor;
             cy = centerY + dy * factor;
          }

          if (mode === 'cmyk') {
             // CMYK Separation
             const cmyk = this.rgbToCmyk(r, g, b);
             const offset = cellSize * 0.15;
             const maxR = cellSize * 0.8;
             // Cyan layer
             if (cmyk.c > 0.05) {
                 const rC = cmyk.c * maxR;
                 svgParts.push(`<circle cx="${cx + cellSize/2 - offset}" cy="${cy + cellSize/2 - offset}" r="${rC}" fill="#00ffff" style="mix-blend-mode: multiply;" />`);
             }
             // Magenta layer
             if (cmyk.m > 0.05) {
                 const rM = cmyk.m * maxR;
                 svgParts.push(`<circle cx="${cx + cellSize/2 + offset}" cy="${cy + cellSize/2 - offset}" r="${rM}" fill="#ff00ff" style="mix-blend-mode: multiply;" />`);
             }
             // Yellow layer
             if (cmyk.y > 0.05) {
                 const rY = cmyk.y * maxR;
                 svgParts.push(`<circle cx="${cx + cellSize/2}" cy="${cy + cellSize/2 + offset}" r="${rY}" fill="#ffff00" style="mix-blend-mode: multiply;" />`);
             }
             // Black layer
             if (cmyk.k > 0.05) {
                 const rK = cmyk.k * maxR;
                 svgParts.push(`<circle cx="${cx + cellSize/2}" cy="${cy + cellSize/2}" r="${rK}" fill="#000000" style="mix-blend-mode: multiply;" />`);
             }
             continue; // Skip the rest for CMYK since it uses its own shapes
          }
          
          let thickness = 0;
          let drawDark = false;
          if (mode === 'monochrome') {
            thickness = ((255 - luminance) / 255) * (cellSize * 0.6);
            drawDark = true;
          } else {
            thickness = (luminance / 255) * (cellSize * 0.6);
          }
          
          // Don't draw if thickness is effectively invisible
          if (thickness < 0.5) continue;
          
          // Determine Color
          let color = '#ffffff';
          if (mode === 'monochrome') color = '#000000';
          else if (mode === 'neon') color = '#00ff41'; // Matrix green
          else if (mode === 'original') color = `rgb(${r},${g},${b})`;
          else if (mode === 'duotone-pink-blue') {
             color = this.lerpColor('#ff00aa', '#00ffff', luminance / 255);
          }
          else if (mode === 'duotone-cyber') {
             color = this.lerpColor('#390099', '#00ffcc', luminance / 255);
          }

          // Alternate shapes like a checkerboard based on grid position
          const isAlternateShape = (x + y) % 2 === 0;

          // Mixed Theme Override
          let currentTheme = theme;
          if (theme === 'mixed') {
             if (drawDark) {
               if (luminance < 85) currentTheme = 'square';
               else if (luminance < 170) currentTheme = 'triangle';
               else currentTheme = 'circle';
             } else {
               if (luminance > 170) currentTheme = 'square';
               else if (luminance > 85) currentTheme = 'triangle';
               else currentTheme = 'circle';
             }
          }

          if (isTextMode) {
             let charToDraw = isAlternateShape ? char0 : char1;
             if (isAscii) {
                // Map luminance to ascii char
                const charIndex = Math.floor((luminance / 255) * (asciiChars.length - 1));
                charToDraw = drawDark ? asciiChars[asciiChars.length - 1 - charIndex] : asciiChars[charIndex];
             }
             // FontSize is determined by thickness (luminance)
             let fontSize = Math.max(cellSize * 0.4, (thickness / (cellSize * 0.6)) * (cellSize * 1.2));
             if (fontSize < cellSize * 0.2) continue; // skip too tiny elements entirely
             
             svgParts.push(`<text x="${cx + cellSize/2}" y="${cy + cellSize/2}" font-family="monospace, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${color}" text-anchor="middle" dominant-baseline="central">${charToDraw}</text>`);
          } else {
             const cxC = cx + cellSize/2;
             const cyC = cy + cellSize/2;
             
             if (currentTheme === 'square') {
                const wh = thickness * 1.5;
                svgParts.push(`<rect x="${cxC - wh/2}" y="${cyC - wh/2}" width="${wh}" height="${wh}" fill="${color}" />`);
             } else if (currentTheme === 'triangle') {
                const rTri = thickness * 1.5;
                svgParts.push(`<polygon points="${cxC},${cyC - rTri} ${cxC - rTri},${cyC + rTri} ${cxC + rTri},${cyC + rTri}" fill="${color}" />`);
             } else if (currentTheme === 'circle') {
                const radius = thickness * 0.8;
                svgParts.push(`<circle cx="${cxC}" cy="${cyC}" r="${radius}" fill="${color}" />`);
             } else { // Classic Theme (X and O)
               if (isAlternateShape) {
                 // CROSS (X)
                 const margin = cellSize * 0.15;
                 svgParts.push(`<path d="M${cx+margin},${cy+margin} L${cx+cellSize-margin},${cy+cellSize-margin} M${cx+cellSize-margin},${cy+margin} L${cx+margin},${cy+cellSize-margin}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" fill="none" />`);
               } else {
                 // CIRCLE (O)
                 const radius = (cellSize / 2) - (cellSize * 0.15);
                 svgParts.push(`<circle cx="${cxC}" cy="${cyC}" r="${radius}" stroke="${color}" stroke-width="${thickness}" fill="none" />`);
               }
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
      this.btnGenerate.innerHTML = '✨ Generate Halftone Art';
      this.btnGenerate.disabled = false;
    }
  },

  downloadSVG() {
    if (!this.generatedSVGString) return;
    const blob = new Blob([this.generatedSVGString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halftone-art_${Date.now()}.svg`;
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
  }

};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
