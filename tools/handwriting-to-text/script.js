/// <reference path="../../js/common.d.ts" />
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
  let activeEngine = 'tesseract';

  // Engine Elements
  const btnTesseract = document.getElementById('engine-tesseract');
  const btnGemini = document.getElementById('engine-gemini');
  const geminiKeyPanel = document.getElementById('gemini-key-panel');
  const apiInput = document.getElementById('api-key-input');
  const btnSaveKey = document.getElementById('btn-save-key');
  const geminiPrompt = document.getElementById('gemini-prompt');
  const tesseractLangPanel = document.getElementById('tesseract-lang-panel');

  // Load API Key
  const savedKey = localStorage.getItem('joogad_gemini_key');
  if (savedKey) apiInput.value = savedKey;

  // Toggle Engine
  btnTesseract.addEventListener('click', () => {
    activeEngine = 'tesseract';
    btnTesseract.classList.add('active');
    btnGemini.classList.remove('active');
    geminiKeyPanel.classList.add('hidden');
    tesseractLangPanel.classList.remove('hidden');
  });

  btnGemini.addEventListener('click', () => {
    activeEngine = 'gemini';
    btnGemini.classList.add('active');
    btnTesseract.classList.remove('active');
    geminiKeyPanel.classList.remove('hidden');
    tesseractLangPanel.classList.add('hidden');
  });

  // Save API Key
  btnSaveKey.addEventListener('click', () => {
    const key = apiInput.value.trim();
    if (key) {
      localStorage.setItem('joogad_gemini_key', key);
      JoogadTools.showToast('API Key saved to browser storage', 'success');
    } else {
      localStorage.removeItem('joogad_gemini_key');
      JoogadTools.showToast('API Key removed', 'info');
    }
  });

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
    
    try {
      if (activeEngine === 'gemini') {
        const apiKey = apiInput.value.trim();
        if (!apiKey) {
          throw new Error('Please enter your Gemini API Key first.');
        }

        progressStatus.textContent = '✨ Gemini AI analyzing image...';
        progressPercent.textContent = '...';
        progressBarFill.style.width = '50%';
        
        const promptType = geminiPrompt.value;
        const text = await extractWithGemini(currentImageFile, apiKey, promptType);
        
        if (text) {
          outputText.value = text;
          btnCopy.disabled = false;
          btnDownload.disabled = false;
          JoogadTools.showToast('Text extracted via Gemini AI!', 'success');
        } else {
          outputText.value = "No text could be found in the image.";
          JoogadTools.showToast('No text detected.', 'warning');
        }
      } else {
        // --- Tesseract Logic (Offline) ---
        const lang = langSelect.value;
        const worker = await Tesseract.createWorker(lang, 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              const pct = Math.round(m.progress * 100);
              progressStatus.textContent = 'Extracting Text (Tesseract)...';
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
      }
    } catch (error) {
      console.error(error);
      const isGeminiKeyError = error.message.includes('API_KEY_INVALID');
      JoogadTools.showToast(isGeminiKeyError ? 'Invalid Gemini API Key.' : 'An error occurred during extraction.', 'error');
      outputText.value = 'Error: ' + error.message;
    } finally {
      // Reset UI
      btnExtract.disabled = false;
      btnExtract.innerHTML = '🔍 Extract Text';
      
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

  // ---- 4. Gemini API Logic ----

  async function extractWithGemini(file, apiKey, promptType) {
    const base64 = await fileToBase64(file);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    let promptText = "";
    switch(promptType) {
      case 'medical':
        promptText = "This is a handwritten medical prescription or doctor's note. Extract all text including medicine names, dosages, and instructions. Mark completely illegible words as [?]. Maintain line breaks.";
        break;
      case 'math':
        promptText = "Extract handwritten mathematical equations, formulas, and text. Format equations clearly. Maintain layout and structure.";
        break;
      case 'receipt':
        promptText = "Extract text from this receipt/bill. Structure the output clearly with items and prices if possible. Be precise with numbers.";
        break;
      default:
        promptText = "You are an expert OCR engine. Extract ALL handwriting and text from this image. Maintain the original line breaks and paragraph structure. Auto-detect the language (English, Hindi, or mixed). Output ONLY the extracted text. Mark illegible words as [?]. If no text is found, reply exactly with: NO_TEXT_FOUND";
    }

    const payload = {
      contents: [{
        parts: [
          { inline_data: { mime_type: file.type, data: base64 } },
          { text: promptText }
        ]
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API connection failed.');
    }

    const extracted = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (extracted.trim() === 'NO_TEXT_FOUND') return '';
    return extracted.trim();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const b64 = result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

});
