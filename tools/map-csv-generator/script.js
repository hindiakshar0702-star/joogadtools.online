document.addEventListener('DOMContentLoaded', () => {
  // Config & State
  let points = []; 
  let markers = []; 
  let pointIdCounter = 1;
  let isRouteMode = false;

  // DOM Elements
  const searchInput = document.getElementById('address-search');
  const btnSearch = document.getElementById('btn-search');
  const routeToggle = document.getElementById('route-mode-toggle');
  const btnMyLocation = document.getElementById('btn-my-location');
  
  const pointsCountEl = document.getElementById('points-count');
  const sortableList = document.getElementById('sortable-list');
  const btnClearAll = document.getElementById('btn-clear-all');
  
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportKml = document.getElementById('btn-export-kml');
  
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  // Initialize Map
  const map = L.map('map').setView([20.5937, 78.9629], 5); // Center India by default
  
  // Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  let polyline = L.polyline([], {color: '#6C63FF', weight: 4}).addTo(map);

  // Init Sortable
  new Sortable(sortableList, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: function () {
      syncStateFromDOM();
      redrawMap();
    }
  });

  // --- Handlers ---
  
  // Toggle Route Mode
  routeToggle.addEventListener('change', (e) => {
    isRouteMode = e.target.checked;
    redrawMap();
  });

  // Map Click -> Add Point & Reverse Geocode
  map.on('click', async (e) => {
    const lat = parseFloat(e.latlng.lat.toFixed(5));
    const lng = parseFloat(e.latlng.lng.toFixed(5));
    
    let label = `Point ${pointIdCounter}`;
    const pId = pointIdCounter++;
    addPoint(pId, lat, lng, label);

    // Reverse Geocoding
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      if(data && data.name) label = data.name;
      else if(data && data.address) {
        label = data.address.city || data.address.town || data.address.village || data.address.state || label;
      }
      updatePointLabel(pId, label);
    } catch (err) {
      console.error('Geocoding failed', err);
    }
  });

  // Search Address -> Forward Geocode
  btnSearch.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if(!query) return;

    btnSearch.disabled = true;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(Number(item.lat).toFixed(5));
        const lng = parseFloat(Number(item.lon).toFixed(5));
        
        map.flyTo([lat, lng], 14);
        
        const pId = pointIdCounter++;
        addPoint(pId, lat, lng, item.name || query);
        JoogadTools.showToast('Location Found!', 'success');
      } else {
        JoogadTools.showToast('Location not found', 'error');
      }
    } catch(err) {
      JoogadTools.showToast('Search Failed', 'error');
    } finally {
      btnSearch.disabled = false;
    }
  });
  
  searchInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') btnSearch.click();
  });

  // Geolocation
  btnMyLocation.addEventListener('click', () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        map.flyTo([lat, lng], 15);
        const pId = pointIdCounter++;
        addPoint(pId, lat, lng, "My Location");
        JoogadTools.showToast('Location Found', 'success');
      }, (err) => {
        JoogadTools.showToast('Location access denied', 'error');
      });
    }
  });

  // --- Logic Methods ---
  function addPoint(id, lat, lng, label) {
    points.push({id, lat, lng, label});
    renderTable();
    redrawMap();
  }

  function updatePointLabel(id, newLabel) {
    const pt = points.find(p => p.id === id);
    if(pt) {
      pt.label = newLabel;
      const input = document.querySelector(`.location-input[data-id="${id}"]`);
      if(input) input.value = newLabel;
      renderTable(); // Keep DOM clean
      redrawMap();
    }
  }

  function deletePoint(id) {
    points = points.filter(p => p.id !== id);
    renderTable();
    redrawMap();
  }

  function syncStateFromDOM() {
    const newOrder = [];
    const rows = sortableList.querySelectorAll('tr');
    rows.forEach(row => {
      const id = parseInt(row.dataset.id);
      const inputVal = row.querySelector('.location-input').value;
      const pt = points.find(p => p.id === id);
      if(pt) {
        pt.label = inputVal;
        newOrder.push(pt);
      }
    });
    points = newOrder;
  }

  // --- Renders ---
  function renderTable() {
    sortableList.innerHTML = '';
    points.forEach((pt, index) => {
      const tr = document.createElement('tr');
      tr.dataset.id = pt.id;
      tr.innerHTML = `
        <td class="drag-handle">☰</td>
        <td><input type="text" class="location-input form-input" data-id="${pt.id}" value="${pt.label}"></td>
        <td class="coords-text">${pt.lat}, ${pt.lng}</td>
        <td><button class="btn-del" data-id="${pt.id}">×</button></td>
      `;
      sortableList.appendChild(tr);
    });
    
    sortableList.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deletePoint(parseInt(e.target.dataset.id));
      });
    });
    
    sortableList.querySelectorAll('.location-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const id = parseInt(e.target.dataset.id);
        const pt = points.find(p => p.id === id);
        if(pt) pt.label = e.target.value;
        redrawMap();
      });
    });
    
    pointsCountEl.textContent = points.length;
  }

  function redrawMap() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    polyline.setLatLngs([]);
    
    const latlngs = [];
    
    points.forEach((pt, index) => {
      const ll = [pt.lat, pt.lng];
      latlngs.push(ll);
      
      const pLabel = isRouteMode ? `${index+1}` : pt.label;
      const m = L.marker(ll).addTo(map).bindTooltip(pLabel, { direction: 'top', offset: [0,-10]});
      markers.push(m);
    });
    
    if(isRouteMode) {
      polyline.setLatLngs(latlngs);
    }
  }

  btnClearAll.addEventListener('click', () => {
    if(confirm("Clear all points?")) {
      points = [];
      renderTable();
      redrawMap();
    }
  });

  // --- Exports ---
  btnExportCsv.addEventListener('click', () => {
    if(!points.length) return JoogadTools.showToast('No points to export', 'warning');
    const header = "Latitude,Longitude,Label\n";
    const csvContent = points.map(p => `${p.lat},${p.lng},"${p.label.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "Map_Coordinates.csv");
    JoogadTools.showToast('CSV Exported', 'success');
  });

  btnExportJson.addEventListener('click', () => {
    if(!points.length) return;
    const cleanPoints = points.map(p => ({lat: p.lat, lng: p.lng, label: p.label}));
    const blob = new Blob([JSON.stringify(cleanPoints, null, 2)], { type: 'application/json' });
    saveAs(blob, "Map_Coordinates.json");
    JoogadTools.showToast('JSON Exported', 'success');
  });

  btnExportKml.addEventListener('click', () => {
    if(!points.length) return;
    let placemarks = points.map(p => `
      <Placemark>
        <name>${p.label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</name>
        <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
      </Placemark>
    `).join('\n');
    
    let lineString = '';
    if(isRouteMode && points.length > 1) {
      const coords = points.map(p => `${p.lng},${p.lat},0`).join('\n');
      lineString = `
      <Placemark>
        <name>Route Path</name>
        <LineString><coordinates>${coords}</coordinates></LineString>
      </Placemark>`;
    }

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <name>Map Coordinates Export</name>
          ${placemarks}
          ${lineString}
        </Document>
      </kml>`;
      
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    saveAs(blob, "Map_Coordinates.kml");
    JoogadTools.showToast('KML Exported', 'success');
  });

  // --- CSV Import ---
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
    if(!file.name.endsWith('.csv')) return JoogadTools.showToast('Must be CSV', 'error');
    
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: function(res) {
        let count = 0;
        let startIdx = 0;
        if(res.data.length && typeof res.data[0][0] === 'string' && res.data[0][0].toLowerCase().includes('lat')) startIdx = 1;
        
        res.data.slice(startIdx).forEach(row => {
          if(row.length >= 2) {
            const lat = parseFloat(row[0]);
            const lng = parseFloat(row[1]);
            const label = row[2] ? row[2] : `Imported ${count+1}`;
            if(!isNaN(lat) && !isNaN(lng)) {
              points.push({id: pointIdCounter++, lat, lng, label});
              count++;
            }
          }
        });
        
        renderTable();
        redrawMap();
        if(points.length > 0) map.flyTo([points[points.length-1].lat, points[points.length-1].lng], 10);
        JoogadTools.showToast(`Imported ${count} locations`, 'success');
      }
    });
  }
});
