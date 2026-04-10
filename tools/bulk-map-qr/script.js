// script.js
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnSample = document.getElementById('btn-sample');
  const btnParseManual = document.getElementById('btn-parse-manual');
  const manualInput = document.getElementById('manual-input');
  
  const previewSection = document.getElementById('preview-section');
  const dataTableBody = document.querySelector('#data-table tbody');
  const totalCountEl = document.getElementById('total-count');
  const btnGenerate = document.getElementById('btn-generate');
  const btnClear = document.getElementById('btn-clear');
  
  const progressContainer = document.getElementById('progress-container');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  // Styling Inputs
  const qrDotsStyle = document.getElementById('qr-dots-style');
  const qrCornerStyle = document.getElementById('qr-corner-style');
  const qrFgColor = document.getElementById('qr-fg-color');
  const qrFgValue = document.getElementById('qr-fg-value');
  const qrBgColor = document.getElementById('qr-bg-color');
  const qrBgValue = document.getElementById('qr-bg-value');
  const qrExportFormat = document.getElementById('qr-export-format');

  let parsedData = []; 

  // --- Dynamic Color Sync ---
  qrFgColor.addEventListener('input', (e) => qrFgValue.textContent = e.target.value);
  qrBgColor.addEventListener('input', (e) => qrBgValue.textContent = e.target.value);

  // --- CSV Download ---
  btnSample.addEventListener('click', () => {
    const csvContent = "Latitude,Longitude,Label\n28.6139,77.2090,India Gate\n40.7128,-74.0060,Statue of Liberty";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "Sample_Map_Locations.csv");
  });

  // --- Drag and Drop Logic ---
  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
      JoogadTools.showToast('Please upload a valid CSV file', 'error');
      return;
    }
    
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: function(results) {
        processRawArray(results.data);
      },
      error: function() {
        JoogadTools.showToast('Error parsing CSV', 'error');
      }
    });
  }

  // --- Manual Entry Logic ---
  btnParseManual.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (!text) {
      JoogadTools.showToast('Please enter some data', 'warning');
      return;
    }
    const results = Papa.parse(text, { skipEmptyLines: true });
    processRawArray(results.data);
  });

  // --- Common Processing ---
  function processRawArray(dataArray) {
    parsedData = [];
    let startIndex = 0;
    if (dataArray.length > 0 && typeof dataArray[0][0] === 'string' && dataArray[0][0].toLowerCase().includes('lat')) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < dataArray.length; i++) {
      const row = dataArray[i];
      if (row.length >= 2) {
        const lat = row[0].trim();
        const lon = row[1].trim();
        const label = row[2] ? row[2].trim() : `Location_${i}`;
        
        if (!isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
          parsedData.push({ lat, lon, label });
        }
      }
    }
    
    if (parsedData.length === 0) {
      JoogadTools.showToast('No valid coordinates found (Format: Lat, Lon, Label)', 'error');
      return;
    }
    
    renderPreview();
    JoogadTools.showToast(`Successfully parsed ${parsedData.length} locations`, 'success');
  }

  function renderPreview() {
    dataTableBody.innerHTML = '';
    const displayData = parsedData.slice(0, 100);
    
    displayData.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.lat}</td>
        <td>${item.lon}</td>
        <td>${item.label}</td>
      `;
      dataTableBody.appendChild(tr);
    });

    if (parsedData.length > 100) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="text-align:center">+ ${parsedData.length - 100} more locations</td>`;
      dataTableBody.appendChild(tr);
    }

    totalCountEl.textContent = parsedData.length;
    previewSection.style.display = 'block';
  }

  btnClear.addEventListener('click', () => {
    parsedData = [];
    previewSection.style.display = 'none';
    dataTableBody.innerHTML = '';
    manualInput.value = '';
    fileInput.value = '';
    progressContainer.style.display = 'none';
  });

  // --- Generate & ZIP Logic (Styled) ---
  btnGenerate.addEventListener('click', async () => {
    if (parsedData.length === 0) return;
    
    progressContainer.style.display = 'block';
    btnGenerate.disabled = true;
    btnClear.disabled = true;
    
    const zip = new JSZip();
    const folder = zip.folder("Map_QRCodes");

    const format = qrExportFormat.value; // svg, png, webp

    // Pre-configure the base QRCode options
    const qrOptions = {
        width: 1024,
        height: 1024,
        type: format === 'svg' ? 'svg' : 'canvas', // svg directly writes svg string
        data: "", 
        margin: 10,
        qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: "H"
        },
        dotsOptions: {
            color: qrFgColor.value,
            type: qrDotsStyle.value // square, dots, rounded, classy, etc.
        },
        backgroundOptions: {
            color: qrBgColor.value
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 0
        },
        cornersSquareOptions: {
            color: qrFgColor.value,
            type: qrCornerStyle.value // dot, square, extra-rounded
        }
    };
    
    const qrCode = new QRCodeStyling(qrOptions);
    
    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      const url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}`;
      
      // Update data logic
      qrCode.update({ data: url });
      
      progressFill.style.width = `${((i + 1) / parsedData.length) * 100}%`;
      progressText.textContent = `${i + 1} / ${parsedData.length}`;
      
      // Get buffer as blob
      const buffer = await qrCode.getRawData(format);
      
      if (buffer) {
        const safeName = item.label.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
        const fileName = `${i + 1}_${safeName}.${format}`;
        
        // zip.folder.file expects string or Blob
        folder.file(fileName, buffer);
      }
    }
    
    JoogadTools.showToast('Packaging ZIP...', 'info');
    
    zip.generateAsync({ type: "blob" }).then(function(content) {
      saveAs(content, "Styled_Bulk_QRCodes.zip");
      JoogadTools.showToast('ZIP Downloaded Successfully!', 'success');
      btnGenerate.disabled = false;
      btnClear.disabled = false;
      setTimeout(() => progressContainer.style.display = 'none', 3000);
    });
  });
});
