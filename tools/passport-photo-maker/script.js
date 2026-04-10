document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const step1 = document.getElementById('step-1');
  const step2 = document.getElementById('step-2');
  const step3 = document.getElementById('step-3');
  
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  
  const cropperImage = document.getElementById('cropper-image');
  const aiLoader = document.getElementById('ai-loader');
  const faceWarning = document.getElementById('face-warning');
  
  const selectRatio = document.getElementById('select-ratio');
  const customPhotoWrap = document.getElementById('custom-photo-wrap');
  const customPhotoW = document.getElementById('custom-photo-w');
  const customPhotoH = document.getElementById('custom-photo-h');
  const customPhotoUnit = document.getElementById('custom-photo-unit');
  const btnApplyCustomPhoto = document.getElementById('btn-apply-custom-photo');
  
  const btnBack1 = document.getElementById('btn-back-1');
  const btnConfirmCrop = document.getElementById('btn-confirm-crop');
  
  const selectPaper = document.getElementById('select-paper');
  const customPaperWrap = document.getElementById('custom-paper-wrap');
  const customPaperW = document.getElementById('custom-paper-w');
  const customPaperH = document.getElementById('custom-paper-h');
  const customPaperUnit = document.getElementById('custom-paper-unit');
  const btnApplyCustomPaper = document.getElementById('btn-apply-custom-paper');
  
  const inputMargin = document.getElementById('input-margin');
  const marginVal = document.getElementById('margin-val');
  const inputGap = document.getElementById('input-gap');
  const gapVal = document.getElementById('gap-val');
  const checkCenter = document.getElementById('check-center');
  const statSize = document.getElementById('stat-size');
  const statCopies = document.getElementById('stat-copies');
  const previewCanvas = document.getElementById('preview-canvas');
  
  const containerGap = document.getElementById('container-gap');
  
  const btnBack2 = document.getElementById('btn-back-2');
  const btnExportPdf = document.getElementById('btn-export-pdf');

  // State
  let cropper;
  let croppedDataUrl = null;
  let modelsLoaded = false;
  let selectedPhotoW = 35; // mm
  let selectedPhotoH = 45; // mm
  
  const MODELS_URL = 'https://vladmandic.github.io/face-api/model/';

  // Math helper
  function convertUnit(value, fromUnit, toUnit) {
    if(fromUnit === toUnit) return value;
    
    // Convert to mm first
    let mmValue = value;
    if (fromUnit === 'cm') mmValue = value * 10;
    if (fromUnit === 'in') mmValue = value * 25.4;
    
    // Convert mm to target
    if (toUnit === 'mm') return mmValue;
    if (toUnit === 'cm') return mmValue / 10;
    if (toUnit === 'in') return mmValue / 25.4;
    
    return value;
  }
  
  function convertToMm(value, unit) {
    return convertUnit(value, unit, 'mm');
  }

  // --- Step 1: Upload ---
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover');});
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', (e) => { if(e.target.files.length) handleFile(e.target.files[0]); });

  function handleFile(file) {
    if(!file.type.startsWith('image/')) return JoogadTools.showToast('Please upload an image', 'error');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      cropperImage.src = e.target.result;
      goToStep(2);
      initAIAndCropper();
    };
    reader.readAsDataURL(file);
  }

  function goToStep(stepNum) {
    step1.style.display = 'none';
    step2.style.display = 'none';
    step3.style.display = 'none';
    if(stepNum === 1) step1.style.display = 'block';
    if(stepNum === 2) step2.style.display = 'block';
    if(stepNum === 3) step3.style.display = 'block';
  }

  // --- Step 2: AI Check & Crop ---
  async function initAIAndCropper() {
    aiLoader.style.display = 'flex';
    faceWarning.style.display = 'none';
    
    // Cleanup previous instance
    if(cropper) { cropper.destroy(); cropper = null; }

    try {
      if(!modelsLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
        modelsLoaded = true;
      }

      // We need an offscreen image to analyze because Cropper alters DOM
      const img = new Image();
      img.src = cropperImage.src;
      await new Promise(r => { img.onload = r; });
      
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
      
      if(detections) {
        // Calculate symmetry
        const landmarks = detections.landmarks;
        const nose = landmarks.getNose()[0]; // top of nose bridge
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        // simple heuristic: distance from nose to left eye vs right eye
        const distL = Math.hypot(nose.x - leftEye[0].x, nose.y - leftEye[0].y);
        const distR = Math.hypot(rightEye[3].x - nose.x, rightEye[3].y - nose.y);
        
        const ratio = distL / distR;
        if(ratio < 0.6 || ratio > 1.4) {
          faceWarning.style.display = 'block'; // Not front-facing warning
        } else {
          JoogadTools.showToast('Face validated: Perfect Alignment!', 'success');
        }
      } else {
         JoogadTools.showToast('No face detected. Proceed with manually cropping.', 'warning');
      }
    } catch(err) {
      console.log('AI error skipped', err);
    }

    aiLoader.style.display = 'none';
    
    // Init cropper
    startCropper(parseFloat(selectRatio.value));
  }

  function startCropper(aspectRatio) {
    if(cropper) cropper.destroy();
    cropper = new Cropper(cropperImage, {
      aspectRatio: aspectRatio,
      viewMode: 1,
      guides: true,
      autoCropArea: 0.8,
    });
    
    // Update sizes immediately
    const option = selectRatio.options[selectRatio.selectedIndex];
    selectedPhotoW = parseFloat(option.dataset.w);
    selectedPhotoH = parseFloat(option.dataset.h);
  }

  // Handle Photo Unit Auto-Conversion
  let currentPhotoUnit = 'mm';
  customPhotoUnit.addEventListener('change', (e) => {
    const newUnit = e.target.value;
    const w = parseFloat(customPhotoW.value) || 0;
    const h = parseFloat(customPhotoH.value) || 0;
    
    if(w > 0) customPhotoW.value = convertUnit(w, currentPhotoUnit, newUnit).toFixed(3).replace(/\.?0+$/, '');
    if(h > 0) customPhotoH.value = convertUnit(h, currentPhotoUnit, newUnit).toFixed(3).replace(/\.?0+$/, '');
    
    currentPhotoUnit = newUnit;
  });

  selectRatio.addEventListener('change', (e) => {
    if(e.target.value === 'custom') {
      customPhotoWrap.style.display = 'flex';
    } else {
      customPhotoWrap.style.display = 'none';
      startCropper(parseFloat(e.target.value));
    }
  });

  btnApplyCustomPhoto.addEventListener('click', () => {
    let w = parseFloat(customPhotoW.value);
    let h = parseFloat(customPhotoH.value);
    const unit = customPhotoUnit.value;
    if(w > 0 && h > 0) {
      w = convertToMm(w, unit);
      h = convertToMm(h, unit);
      selectedPhotoW = w;
      selectedPhotoH = h;
      startCropper(w / h);
      JoogadTools.showToast(`Custom Photo Size Applied (${w.toFixed(1)}x${h.toFixed(1)} mm)`, 'success');
    } else {
      JoogadTools.showToast('Invalid dimensions', 'warning');
    }
  });

  btnBack1.addEventListener('click', () => { goToStep(1); });

  btnConfirmCrop.addEventListener('click', () => {
    if(!cropper) return;
    const canvas = cropper.getCroppedCanvas({
      width: selectedPhotoW * 10, // export 10x multiplier for print quality (roughly 350x450 px)
      height: selectedPhotoH * 10,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    croppedDataUrl = canvas.toDataURL('image/jpeg', 1.0);
    goToStep(3);
    renderGridPreview();
  });

  // --- Step 3: Tiling & Paper Size ---
  
  [selectPaper, inputMargin, inputGap, checkCenter].forEach(el => {
    el.addEventListener('input', (e) => {
      if(el === selectPaper) {
        if(selectPaper.value === 'custom') customPaperWrap.style.display = 'flex';
        else customPaperWrap.style.display = 'none';
      }
      marginVal.textContent = inputMargin.value;
      gapVal.textContent = inputGap.value;
      renderGridPreview();
    });
  });
  
  // Handle Paper Unit Auto-Conversion
  let currentPaperUnit = 'mm';
  customPaperUnit.addEventListener('change', (e) => {
    const newUnit = e.target.value;
    const w = parseFloat(customPaperW.value) || 0;
    const h = parseFloat(customPaperH.value) || 0;
    
    if(w > 0) customPaperW.value = convertUnit(w, currentPaperUnit, newUnit).toFixed(3).replace(/\.?0+$/, '');
    if(h > 0) customPaperH.value = convertUnit(h, currentPaperUnit, newUnit).toFixed(3).replace(/\.?0+$/, '');
    
    currentPaperUnit = newUnit;
  });

  if(btnApplyCustomPaper) {
    btnApplyCustomPaper.addEventListener('click', () => {
      renderGridPreview();
      JoogadTools.showToast('Custom Page Size Applied', 'success');
    });
  }

  btnBack2.addEventListener('click', () => { goToStep(2); });

  function renderGridPreview() {
    statSize.textContent = `${selectedPhotoW} x ${selectedPhotoH} mm`;
    
    if(selectPaper.value === 'single') {
       containerGap.style.display = 'none';
       previewCanvas.width = selectedPhotoW * 10;
       previewCanvas.height = selectedPhotoH * 10;
       const ctx = previewCanvas.getContext('2d');
       ctx.fillStyle = "white"; ctx.fillRect(0,0, previewCanvas.width, previewCanvas.height);
       
       const img = new Image();
       img.onload = () => { ctx.drawImage(img, 0, 0, previewCanvas.width, previewCanvas.height); };
       img.src = croppedDataUrl;
       
       statCopies.textContent = "1";
       return;
    }

    containerGap.style.display = 'block';
    
    let paperW, paperH;
    if(selectPaper.value === 'custom') {
       let cw = parseFloat(customPaperW.value);
       let ch = parseFloat(customPaperH.value);
       const unit = customPaperUnit.value;
       paperW = convertToMm(cw, unit);
       paperH = convertToMm(ch, unit);
    } else {
       const option = selectPaper.options[selectPaper.selectedIndex];
       paperW = parseFloat(option.dataset.w);
       paperH = parseFloat(option.dataset.h);
    }
    
    const m = parseFloat(inputMargin.value);
    const g = parseFloat(inputGap.value);
    
    const cw = paperW * 5; // 5x display scale for canvas preview
    const ch = paperH * 5;
    previewCanvas.width = cw;
    previewCanvas.height = ch;
    
    const ctx = previewCanvas.getContext('2d');
    ctx.fillStyle = "white"; 
    ctx.fillRect(0,0,cw,ch);
    
    // Calculation in mm
    const availW = paperW - (m * 2);
    const availH = paperH - (m * 2);
    
    let cols = Math.floor((availW + g) / (selectedPhotoW + g));
    let rows = Math.floor((availH + g) / (selectedPhotoH + g));
    
    if(cols < 1) cols = 1; if(rows < 1) rows = 1;
    
    // Auto-center calculation
    const totalGridW = (cols * selectedPhotoW) + ((cols - 1) * g);
    const totalGridH = (rows * selectedPhotoH) + ((rows - 1) * g);
    let startX = m;
    let startY = m;
    if (checkCenter.checked) {
      if (availW > totalGridW) startX += (availW - totalGridW) / 2;
      if (availH > totalGridH) startY += (availH - totalGridH) / 2;
    }
    
    const copies = cols * rows;
    statCopies.textContent = copies;
    
    // Draw on Canvas
    const img = new Image();
    img.onload = () => {
      for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
          const x_mm = startX + (c * (selectedPhotoW + g));
          const y_mm = startY + (r * (selectedPhotoH + g));
          
          ctx.drawImage(img, x_mm * 5, y_mm * 5, selectedPhotoW * 5, selectedPhotoH * 5);
          
          // Draw thin cutline
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x_mm * 5, y_mm * 5, selectedPhotoW * 5, selectedPhotoH * 5);
        }
      }
    };
    img.src = croppedDataUrl;
  }

  // --- Export PDF ---
  btnExportPdf.addEventListener('click', async () => {
     JoogadTools.showToast('Generating HD PDF...', 'info');
     const { jsPDF } = window.jspdf;
     
     if(selectPaper.value === 'single') {
       const doc = new jsPDF({
         orientation: selectedPhotoW > selectedPhotoH ? 'l' : 'p',
         unit: 'mm',
         format: [selectedPhotoW, selectedPhotoH]
       });
       doc.addImage(croppedDataUrl, 'JPEG', 0, 0, selectedPhotoW, selectedPhotoH);
       doc.save('Passport_Photo_Single.pdf');
       JoogadTools.showToast('PDF Saved', 'success');
       return;
     }

     let paperW, paperH;
     if(selectPaper.value === 'custom') {
        let cw = parseFloat(customPaperW.value);
        let ch = parseFloat(customPaperH.value);
        const unit = customPaperUnit.value;
        paperW = convertToMm(cw, unit);
        paperH = convertToMm(ch, unit);
     } else {
        const option = selectPaper.options[selectPaper.selectedIndex];
        paperW = parseFloat(option.dataset.w);
        paperH = parseFloat(option.dataset.h);
     }
     
     const m = parseFloat(inputMargin.value);
     const g = parseFloat(inputGap.value);
     
     const doc = new jsPDF({
       orientation: paperW > paperH ? 'l' : 'p',
       unit: 'mm',
       format: [paperW, paperH]
     });
     
     const availW = paperW - (m * 2);
     const availH = paperH - (m * 2);
    
     let cols = Math.floor((availW + g) / (selectedPhotoW + g));
     let rows = Math.floor((availH + g) / (selectedPhotoH + g));
     
     if(cols < 1) cols = 1; if(rows < 1) rows = 1;
     
     // Auto-center calculation for PDF
     const totalGridW = (cols * selectedPhotoW) + ((cols - 1) * g);
     const totalGridH = (rows * selectedPhotoH) + ((rows - 1) * g);
     let startX = m;
     let startY = m;
     if (checkCenter.checked) {
       if (availW > totalGridW) startX += (availW - totalGridW) / 2;
       if (availH > totalGridH) startY += (availH - totalGridH) / 2;
     }

     for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
          const x_mm = startX + (c * (selectedPhotoW + g));
          const y_mm = startY + (r * (selectedPhotoH + g));
          
          doc.addImage(croppedDataUrl, 'JPEG', x_mm, y_mm, selectedPhotoW, selectedPhotoH, undefined, 'FAST');
        }
     }
     
     doc.save('Passport_Grid_Print.pdf');
     JoogadTools.showToast('PDF Downloaded!', 'success');
  });

});
