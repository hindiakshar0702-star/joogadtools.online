/// <reference path="../../js/common.d.ts" />
// --- Chart Generator Logic ---

document.addEventListener("DOMContentLoaded", () => {
  JoogadTools.renderHeader('../../');
  JoogadTools.renderFooter('../../');

  // DOM Elements
  const chartTitle = document.getElementById('chart-title');
  const chartType = document.getElementById('chart-type');
  const chartTheme = document.getElementById('chart-theme');
  const bgColor = document.getElementById('bg-color');
  const textColor = document.getElementById('text-color');
  const dataRowsContainer = document.getElementById('data-rows');
  const btnAddRow = document.getElementById('btn-add-row');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  
  const btnExportPng = document.getElementById('btn-export-png');
  const btnExportJpg = document.getElementById('btn-export-jpg');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnExportSvg = document.getElementById('btn-export-svg');

  // Themes
  const themes = {
    vibrant: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED'],
    pastel: ['#FFB1C1', '#9AD0F5', '#FFE6AA', '#A4DFDF', '#CCB2FF', '#FFC899', '#EBEBEB'],
    monochrome: ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ff7c43'],
    neon: ['#39FF14', '#00FFFF', '#FF00FF', '#FFE600', '#FF003C', '#00FF00', '#FF00AA']
  };

  let myChart = null;

  // --- Configuration Generator ---
  function getChartConfig(isExport = false) {
    const titleVal = chartTitle.value || 'My Chart';
    const typeVal = chartType.value;
    const themeVal = chartTheme.value;
    const colors = themes[themeVal];
    const tColor = textColor.value;

    const labels = [];
    const dataValues = [];
    
    document.querySelectorAll('.data-row').forEach(row => {
      const labelValue = row.querySelector('.row-label').value;
      const numValue = parseFloat(row.querySelector('.row-value').value);
      if(labelValue && !isNaN(numValue)) {
        labels.push(labelValue);
        dataValues.push(numValue);
      }
    });

    const dataset = {
      label: titleVal,
      data: dataValues,
      backgroundColor: typeVal === 'line' || typeVal === 'radar' ? colors[0] + '40' : colors,
      borderColor: typeVal === 'line' || typeVal === 'radar' ? colors[0] : '#ffffff',
      borderWidth: 2,
      pointBackgroundColor: colors[0],
      fill: typeVal === 'line' || typeVal === 'radar'
    };

    // Global defaults
    Chart.defaults.color = tColor;

    // Adjust font sizes for export (since it's a larger "extra high quality" canvas)
    const titleSize = isExport ? 28 : 18;
    const tickSize = isExport ? 16 : 12;

    return {
      type: typeVal,
      data: {
        labels: labels,
        datasets: [dataset]
      },
      options: {
        responsive: !isExport,
        maintainAspectRatio: !isExport,
        animation: isExport ? false : undefined, // disable animation for instant export
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: tColor, font: { size: tickSize } }
          },
          title: {
            display: true,
            text: titleVal,
            color: tColor,
            font: { size: titleSize }
          }
        },
        scales: (typeVal === 'line' || typeVal === 'bar' || typeVal === 'scatter') ? {
          x: { ticks: { color: tColor, font: { size: tickSize } }, grid: { color: tColor + '20' } },
          y: { ticks: { color: tColor, font: { size: tickSize } }, grid: { color: tColor + '20' } }
        } : {}
      }
    };
  }

  // --- Render Live Chart ---
  function updateChart() {
    canvasWrapper.style.setProperty('--bg-color', bgColor.value);
    
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, getChartConfig(false));
  }

  // Handle row deletion
  function bindRemoveEvents() {
    document.querySelectorAll('.remove-row').forEach(btn => {
      btn.onclick = (e) => {
        if(document.querySelectorAll('.data-row').length > 1) {
          e.target.closest('.data-row').remove();
          updateChart();
        } else {
          JoogadTools.showToast("At least one row is required", "error");
        }
      };
    });
  }

  // Handle inputs changes to update live
  function bindInputEvents() {
    document.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('input', updateChart);
    });
  }

  // Add new row
  btnAddRow.addEventListener('click', () => {
    const rowHTML = `
      <div class="data-row">
        <input type="text" class="form-input row-label" value="New Label">
        <input type="number" class="form-input row-value" value="10">
        <button class="btn btn-danger btn-icon remove-row" title="Remove row">✖</button>
      </div>
    `;
    dataRowsContainer.insertAdjacentHTML('beforeend', rowHTML);
    bindRemoveEvents();
    
    const newRow = dataRowsContainer.lastElementChild;
    newRow.querySelectorAll('.form-input').forEach(inp => {
      inp.addEventListener('input', updateChart);
    });
    
    updateChart();
  });

  // --- Extra High Quality Export Engine ---
  function getHighQualityDataURI(format = 'image/png') {
    // Create an offscreen large canvas for extra high quality (4K-ish)
    const hqCanvas = document.createElement('canvas');
    hqCanvas.width = 1920; 
    hqCanvas.height = 1080;
    const ctx = hqCanvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor.value;
    ctx.fillRect(0, 0, hqCanvas.width, hqCanvas.height);

    // Create a temporary chart, animation is disabled so it draws synchronously
    const tempChart = new Chart(ctx, getChartConfig(true));
    
    // Extract base64
    const dataUrl = hqCanvas.toDataURL(format, 1.0);
    
    // Cleanup
    tempChart.destroy();
    return dataUrl;
  }

  // --- SVG Export Engine ---
  function exportAsSVG() {
    if (typeof C2S === 'undefined') {
      JoogadTools.showToast("SVG engine is still loading...", "error");
      return;
    }
    
    // Create a mock canvas context from canvas2svg library
    const svgContext = new C2S(1920, 1080);
    
    // Fill background
    svgContext.fillStyle = bgColor.value;
    svgContext.fillRect(0, 0, 1920, 1080);

    // Render chart onto the SVG context
    const tempChart = new Chart(svgContext, getChartConfig(true));
    
    // Get raw SVG source
    const serializedSvg = svgContext.getSerializedSvg();
    tempChart.destroy();

    // Create a Blob and trigger download
    const blob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chart_${Date.now()}.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
    JoogadTools.showToast("SVG Downloaded Successfully!");
  }

  // --- Export Events ---
  btnExportPng.addEventListener('click', () => {
    const dataUrl = getHighQualityDataURI('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `HQ_Chart_${Date.now()}.png`;
    a.click();
    JoogadTools.showToast("HQ PNG Downloaded!");
  });

  btnExportJpg.addEventListener('click', () => {
    const dataUrl = getHighQualityDataURI('image/jpeg');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `HQ_Chart_${Date.now()}.jpg`;
    a.click();
    JoogadTools.showToast("HQ JPG Downloaded!");
  });

  btnExportPdf.addEventListener('click', () => {
    if(!window.jspdf) {
      JoogadTools.showToast("PDF Library loading, please wait...", "error");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const documentPdf = new jsPDF('landscape', 'mm', 'a4');
    
    // Render HQ PNG first
    const dataUrl = getHighQualityDataURI('image/png');
    
    const chartTitleText = chartTitle.value || 'Chart';
    documentPdf.setFontSize(20);
    documentPdf.text(chartTitleText, 14, 20);
    
    // Fit into PDF keeping aspect ratio
    const imgProps = documentPdf.getImageProperties(dataUrl);
    const pdfWidth = documentPdf.internal.pageSize.getWidth() - 28; 
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    documentPdf.addImage(dataUrl, 'PNG', 14, 30, pdfWidth, pdfHeight);
    documentPdf.save(`HQ_Chart_${Date.now()}.pdf`);
    JoogadTools.showToast("HQ PDF Downloaded!");
  });

  btnExportSvg.addEventListener('click', exportAsSVG);

  // Initialize
  bindRemoveEvents();
  bindInputEvents();
  updateChart(); 
});
