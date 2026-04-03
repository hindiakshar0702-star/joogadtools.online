// ============================================
// Handwriting to Text (OCR) Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('image-input');
  const btnBrowse = document.getElementById('btn-browse');
  const imagePreview = document.getElementById('image-preview');
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const btnClearImage = document.getElementById('btn-clear-image');
  
  const langSelect = document.getElementById('ocr-lang');
  const btnExtract = document.getElementById('btn-extract');
  
  const progressContainer = document.getElementById('progress-container');
  const progressStatus = document.getElementById('progress-status');
  const progressPercent = document.getElementById('progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  
  const outputText = document.getElementById('output-text');
  const btnCopy = document.getElementById('btn-copy');
  const btnDownload = document.getElementById('btn-download');

  let currentImageFile = null;

  // ---- 1. File Upload Handling ----

  // Make the entire upload area clickable
  uploadArea.addEventListener('click', (e) => {
    // Prevent triggering if an internal control is clicked
    if (e.target !== btnClearImage && e.target !== fileInput && e.target !== btnBrowse) {
      fileInput.click();
    }
  });

  // Click to browse button
  btnBrowse.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  // Input change (Browse)
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImage(e.target.files[0]);
      fileInput.value = '';
    }
  });

  // Drag & Drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImage(file);
      } else {
        JoogadTools.showToast('Please upload an image file.', 'error');
      }
    }
  });

  // Paste Image (Ctrl+V)
  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        const file = item.getAsFile();
        handleImage(file);
        break;
      }
    }
  });

  // Process the selected image
  function handleImage(file) {
    currentImageFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.classList.remove('hidden');
      uploadPlaceholder.classList.add('hidden');
      btnClearImage.classList.remove('hidden');
      
      // Enable extract button
      btnExtract.disabled = false;
      
      // Reset output
      outputText.value = '';
      btnCopy.disabled = true;
      btnDownload.disabled = true;
      progressContainer.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  // Clear Image
  btnClearImage.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent clicking the upload area
    currentImageFile = null;
    fileInput.value = '';
    
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');
    btnClearImage.classList.add('hidden');
    
    btnExtract.disabled = true;
    progressContainer.classList.add('hidden');
    outputText.value = '';
    btnCopy.disabled = true;
    btnDownload.disabled = true;
  });

  // ---- 2. OCR Extraction Logic ----

  btnExtract.addEventListener('click', async () => {
    if (!currentImageFile) return;

    // UI Updates
    btnExtract.disabled = true;
    btnExtract.innerHTML = '⏳ Processing...';
    progressContainer.classList.remove('hidden');
    outputText.value = '';
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    
    const lang = langSelect.value;
    
    try {
      const worker = await Tesseract.createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            progressStatus.textContent = 'Extracting Text...';
            progressPercent.textContent = `${pct}%`;
            progressBarFill.style.width = `${pct}%`;
          } else {
            if(m.status) {
              progressStatus.textContent = m.status.charAt(0).toUpperCase() + m.status.slice(1);
            }
          }
        }
      });
      
      const { data: { text } } = await worker.recognize(currentImageFile);
      
      // Result
      if (text.trim()) {
        outputText.value = text;
        btnCopy.disabled = false;
        btnDownload.disabled = false;
        JoogadTools.showToast('Text extracted successfully!', 'success');
      } else {
        outputText.value = "No text could be found in the image.";
        JoogadTools.showToast('No text detected.', 'warning');
      }

      await worker.terminate();

    } catch (error) {
      console.error(error);
      JoogadTools.showToast('An error occurred during extraction.', 'error');
      outputText.value = 'Error: ' + error.message;
    } finally {
      // Reset UI
      btnExtract.disabled = false;
      btnExtract.innerHTML = '🔍 Extract Text';
      
      // Ensure progress bar shows 100% at the end
      progressStatus.textContent = 'Completed';
      progressPercent.textContent = '100%';
      progressBarFill.style.width = '100%';
      
      setTimeout(() => {
        progressContainer.classList.add('hidden');
        progressBarFill.style.width = '0%';
      }, 3000);
    }
  });

  // ---- 3. Export Logic ----

  btnCopy.addEventListener('click', () => {
    if (outputText.value) {
      JoogadTools.copyToClipboard(outputText.value);
    }
  });

  btnDownload.addEventListener('click', () => {
    if (outputText.value) {
      JoogadTools.downloadFile(outputText.value, 'extracted-text.txt');
    }
  });

});
