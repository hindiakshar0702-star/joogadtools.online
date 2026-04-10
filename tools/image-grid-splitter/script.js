/// <reference path="../../js/common.d.ts" />
// ============================================
// Instagram 9-Grid Splitter Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('image-input');
  const btnBrowse = document.getElementById('btn-browse');
  
  const uploadPlaceholder = document.getElementById('upload-placeholder');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const btnClearImage = document.getElementById('btn-clear-image');
  
  const btnSplit = document.getElementById('btn-split');
  const formatSelect = document.getElementById('opt-format');
  const progressState = document.getElementById('progress-state');
  const statusText = document.getElementById('status-text');
  const postInstruction = document.getElementById('post-instruction');

  let currentImage = null; // Will store the HTML Image element
  let originalFilename = "grid";

  // ---- 1. File Upload Handling ----
  
  uploadArea.addEventListener('click', (e) => {
    if (e.target !== btnClearImage && e.target !== fileInput && e.target !== btnBrowse) {
      fileInput.click();
    }
  });

  btnBrowse.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImage(e.target.files[0]);
      fileInput.value = '';
    }
  });

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
      if (e.dataTransfer.files[0].type.startsWith('image/')) {
        handleImage(e.dataTransfer.files[0]);
      } else {
        JoogadTools.showToast('Please upload an image file.', 'error');
      }
    }
  });

  document.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        handleImage(item.getAsFile());
        break;
      }
    }
  });

  function handleImage(file) {
    originalFilename = file.name ? file.name.split('.')[0] : 'grid';
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        
        // Update UI
        imagePreview.src = e.target.result;
        uploadPlaceholder.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        btnClearImage.classList.remove('hidden');
        btnSplit.disabled = false;
        postInstruction.classList.add('hidden');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  btnClearImage.addEventListener('click', (e) => {
    e.stopPropagation();
    currentImage = null;
    fileInput.value = '';
    
    uploadPlaceholder.classList.remove('hidden');
    previewContainer.classList.add('hidden');
    btnClearImage.classList.add('hidden');
    imagePreview.src = '';
    
    btnSplit.disabled = true;
    postInstruction.classList.add('hidden');
  });

  // ---- 2. Processing and Splitting Logic ----
  
  btnSplit.addEventListener('click', async () => {
    if (!currentImage) return;

    btnSplit.disabled = true;
    progressState.classList.remove('hidden');
    statusText.textContent = "Processing slices...";
    
    const format = formatSelect.value;
    const extension = format === 'image/png' ? 'png' : (format === 'image/webp' ? 'webp' : 'jpg');
    
    try {
      // 1. Calculate Center Square Crop
      const size = Math.min(currentImage.naturalWidth, currentImage.naturalHeight);
      const startX = (currentImage.naturalWidth - size) / 2;
      const startY = (currentImage.naturalHeight - size) / 2;
      const sliceSize = size / 3;

      // 2. Initialize JSZip
      const zip = new JSZip();
      
      // Mappings to foolproof the Instagram upload process
      // Grid indices (row, col):
      // 0:(0,0)  1:(0,1)  2:(0,2)
      // 3:(1,0)  4:(1,1)  5:(1,2)
      // 6:(2,0)  7:(2,1)  8:(2,2)
      // Instagram upload sequence mapping (reverse order):
      const uploadOrder = [
        "upload_9th_top_left", "upload_8th_top_mid", "upload_7th_top_right",
        "upload_6th_mid_left", "upload_5th_center",  "upload_4th_mid_right",
        "upload_3rd_bot_left", "upload_2nd_bot_mid", "upload_1st_bot_right"
      ];

      // 3. Generate 9 Canvases
      const promises = [];
      let index = 0;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const sliceName = uploadOrder[index] + "." + extension;
          const sx = startX + (col * sliceSize);
          const sy = startY + (row * sliceSize);

          promises.push(createSliceBlob(currentImage, sx, sy, sliceSize, format).then(blob => {
            zip.file(sliceName, blob);
          }));

          index++;
        }
      }

      await Promise.all(promises);

      // 4. Generate & Download ZIP
      statusText.textContent = "Zipping files...";
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${originalFilename}_joogad_grid.zip`);

      JoogadTools.showToast('Grid created! Check your downloads.', 'success');
      postInstruction.classList.remove('hidden');

    } catch (error) {
      console.error(error);
      JoogadTools.showToast('Failed to create grid.', 'error');
    } finally {
      btnSplit.disabled = false;
      progressState.classList.add('hidden');
    }
  });

  // Helper function to draw slice and return Blob
  function createSliceBlob(img, sx, sy, size, format) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Fill background (in case of PNG transparency converting to JPEG)
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }
      
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, format, 0.95);
    });
  }

});
