/// <reference path="../../js/common.d.ts" />
// CSV Generator — Complete Script with all features
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/csv-generator');
  JoogadTools.renderFooter('tools/csv-generator');

  // ===== STATE =====
  let columns = []; // [{id, name, type, options}]
  let tableData = []; // Array of row objects
  let colIdCounter = 0;

  // ===== INDIAN DATA DICTIONARIES =====
  const INDIAN = {
    firstNames: ['Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Krishna','Ishaan','Shaurya','Diya','Ananya','Aanya','Aadhya','Isha','Kavya','Riya','Priya','Neha','Sara','Rahul','Amit','Vikram','Rohit','Suresh','Pooja','Sneha','Meera','Deepika','Lakshmi','Rajesh','Sandeep','Manish','Nikhil','Gaurav','Swati','Nisha','Pallavi','Komal','Shruti'],
    lastNames: ['Sharma','Patel','Gupta','Singh','Kumar','Verma','Joshi','Agarwal','Shah','Reddy','Nair','Iyer','Rao','Das','Bose','Mishra','Pandey','Chauhan','Pillai','Menon','Tiwari','Saxena','Srivastava','Jain','Mehta','Desai','Chopra','Malhotra','Kapoor','Bhatt'],
    cities: ['Mumbai','Delhi','Bangalore','Hyderabad','Ahmedabad','Chennai','Kolkata','Pune','Jaipur','Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Visakhapatnam','Patna','Vadodara','Ghaziabad','Ludhiana','Agra','Nashik','Faridabad','Meerut','Rajkot','Varanasi','Srinagar','Aurangabad','Dhanbad','Amritsar'],
    states: ['Maharashtra','Delhi','Karnataka','Telangana','Gujarat','Tamil Nadu','West Bengal','Rajasthan','Uttar Pradesh','Madhya Pradesh','Andhra Pradesh','Bihar','Punjab','Haryana','Kerala','Jharkhand','Assam','Odisha','Chhattisgarh','Uttarakhand'],
    banks: ['SBI','HDFC','ICICI','Axis','PNB','BOB','Kotak','IndusInd','Yes','IDBI','Union','Canara','BOI','Central','IOB','Federal','South Indian','Karur Vysya','City Union','DCB'],
    ifscPrefixes: ['SBIN','HDFC','ICIC','UTIB','PUNB','BARB','KKBK','INDB','YESB','IBKL'],
    domains: ['gmail.com','yahoo.co.in','outlook.com','hotmail.com','rediffmail.com'],
    pinRanges: {MH:'4',DL:'1',KA:'5',TN:'6',GJ:'3',RJ:'3',UP:'2',MP:'4',WB:'7',AP:'5'}
  };

  const ENGLISH = {
    firstNames: ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Elizabeth','David','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Emma','Olivia','Ava','Sophia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn'],
    lastNames: ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Anderson','Taylor','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Allen','Young','King','Wright','Hill','Scott','Green','Adams','Baker','Nelson','Carter'],
    cities: ['New York','London','Paris','Tokyo','Sydney','Berlin','Toronto','Dubai','Singapore','Amsterdam'],
    domains: ['gmail.com','yahoo.com','outlook.com','hotmail.com','mail.com']
  };

  // ===== FAKE DATA GENERATORS =====
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max, dec = 2) { return (Math.random() * (max - min) + min).toFixed(dec); }
  function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }

  function generateValue(col, rowIdx, rowData) {
    const t = col.type;
    const o = col.options || {};
    switch (t) {
      case 'text': return rand(['Lorem ipsum','Data entry','Sample text','Hello world','Test record','Random value','Example item','Quick brown fox','Placeholder','Alpha beta']);
      case 'number': return randInt(o.min || 1, o.max || 1000);
      case 'decimal': return randFloat(o.min || 0, o.max || 1000, o.decimals || 2);
      case 'name': return rand(ENGLISH.firstNames) + ' ' + rand(ENGLISH.lastNames);
      case 'email': { const fn = rand(ENGLISH.firstNames).toLowerCase(); return fn + randInt(1,99) + '@' + rand(ENGLISH.domains); }
      case 'phone': return '+1-' + randInt(200,999) + '-' + randInt(100,999) + '-' + randInt(1000,9999);
      case 'date': {
        const start = new Date(o.startDate || '2020-01-01').getTime();
        const end = new Date(o.endDate || '2025-12-31').getTime();
        return new Date(randInt(start, end)).toISOString().split('T')[0];
      }
      case 'boolean': return Math.random() > 0.5 ? 'true' : 'false';
      case 'uuid': return uuid();
      case 'sequence': return (o.start || 1) + rowIdx * (o.step || 1);
      case 'custom_list': { const items = (o.items || 'A,B,C').split(',').map(s => s.trim()); return rand(items); }

      // Indian Data
      case 'indian_name': return rand(INDIAN.firstNames) + ' ' + rand(INDIAN.lastNames);
      case 'indian_phone': return '+91 ' + randInt(7,9) + String(randInt(100000000,999999999)).padStart(9,'0');
      case 'indian_email': { const fn = rand(INDIAN.firstNames).toLowerCase(); return fn + randInt(1,999) + '@' + rand(INDIAN.domains); }
      case 'indian_pan': {
        const l = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return l[randInt(0,25)] + l[randInt(0,25)] + l[randInt(0,25)] + l[randInt(0,25)] + 'ABCFGHLJPT'[randInt(0,9)] + randInt(1000,9999) + l[randInt(0,25)];
      }
      case 'indian_gstin': {
        const state = String(randInt(1,37)).padStart(2,'0');
        const pan = generateValue({type:'indian_pan'}, 0, {});
        return state + pan + randInt(1,9) + 'Z' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[randInt(0,35)];
      }
      case 'indian_aadhaar': return randInt(2000,9999) + ' ' + randInt(1000,9999) + ' ' + randInt(1000,9999);
      case 'indian_ifsc': return rand(INDIAN.ifscPrefixes) + '0' + String(randInt(10000,99999)).padStart(5,'0');
      case 'indian_pin': return String(randInt(110001,855117)).padStart(6,'0');
      case 'indian_city': return rand(INDIAN.cities);
      case 'indian_state': return rand(INDIAN.states);
      case 'indian_upi': { const fn = rand(INDIAN.firstNames).toLowerCase(); const bank = rand(['oksbi','okhdfcbank','okicici','okaxis','paytm','ybl','apl','ibl']); return fn + randInt(1,99) + '@' + bank; }
      case 'indian_vehicle': {
        const st = ['MH','DL','KA','TN','GJ','RJ','UP','MP','WB','AP'][randInt(0,9)];
        return st + ' ' + String(randInt(1,99)).padStart(2,'0') + ' ' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randInt(0,25)] + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randInt(0,25)] + ' ' + String(randInt(1000,9999));
      }

      // Regex pattern
      case 'regex': return generateFromRegex(o.pattern || '[A-Z]{3}-[0-9]{4}');

      // Formula
      case 'formula': return evaluateFormula(o.formula || '', rowData, columns);

      default: return '';
    }
  }

  // ===== REGEX GENERATOR =====
  function generateFromRegex(pattern) {
    let result = '';
    let i = 0;
    while (i < pattern.length) {
      if (pattern[i] === '[') {
        const end = pattern.indexOf(']', i);
        if (end === -1) { result += pattern[i]; i++; continue; }
        const charClass = pattern.substring(i + 1, end);
        const chars = expandCharClass(charClass);
        i = end + 1;
        let count = 1;
        if (i < pattern.length && pattern[i] === '{') {
          const ce = pattern.indexOf('}', i);
          if (ce !== -1) { count = parseInt(pattern.substring(i + 1, ce)) || 1; i = ce + 1; }
        }
        for (let c = 0; c < count; c++) result += rand(chars);
      } else if (pattern[i] === '\\' && i + 1 < pattern.length) {
        result += pattern[i + 1]; i += 2;
      } else {
        result += pattern[i]; i++;
      }
    }
    return result;
  }

  function expandCharClass(cls) {
    const chars = [];
    for (let i = 0; i < cls.length; i++) {
      if (i + 2 < cls.length && cls[i + 1] === '-') {
        const start = cls.charCodeAt(i), end = cls.charCodeAt(i + 2);
        for (let c = start; c <= end; c++) chars.push(String.fromCharCode(c));
        i += 2;
      } else {
        chars.push(cls[i]);
      }
    }
    return chars;
  }

  // ===== FORMULA EVALUATOR =====
  function evaluateFormula(formula, rowData, cols) {
    try {
      let expr = formula;
      cols.forEach(c => {
        const re = new RegExp('\\b' + c.name.replace(/[^a-zA-Z0-9_]/g, '') + '\\b', 'g');
        const val = rowData[c.id];
        expr = expr.replace(re, isNaN(val) ? 0 : Number(val));
      });
      return Number(new Function('return ' + expr)()).toFixed(2);
    } catch { return 'ERR'; }
  }

  // ===== COLUMN TYPES =====
  const COL_TYPES = [
    { group: 'Basic', types: [
      { value: 'text', label: '📝 Text' },
      { value: 'number', label: '🔢 Number (Integer)' },
      { value: 'decimal', label: '💲 Decimal Number' },
      { value: 'boolean', label: '✅ Boolean' },
      { value: 'date', label: '📅 Date' },
      { value: 'uuid', label: '🔑 UUID' },
      { value: 'sequence', label: '🔁 Sequence / Auto-ID' },
      { value: 'custom_list', label: '📋 Custom List' },
      { value: 'regex', label: '🔣 Regex Pattern' },
      { value: 'formula', label: '🧮 Formula' },
    ]},
    { group: 'Person', types: [
      { value: 'name', label: '👤 Name (English)' },
      { value: 'email', label: '📧 Email' },
      { value: 'phone', label: '📱 Phone (International)' },
    ]},
    { group: '🇮🇳 Indian Data', types: [
      { value: 'indian_name', label: '🇮🇳 Indian Name' },
      { value: 'indian_phone', label: '🇮🇳 Indian Phone (+91)' },
      { value: 'indian_email', label: '🇮🇳 Indian Email' },
      { value: 'indian_pan', label: '🇮🇳 PAN Number' },
      { value: 'indian_gstin', label: '🇮🇳 GSTIN' },
      { value: 'indian_aadhaar', label: '🇮🇳 Aadhaar (Masked)' },
      { value: 'indian_ifsc', label: '🇮🇳 IFSC Code' },
      { value: 'indian_pin', label: '🇮🇳 PIN Code' },
      { value: 'indian_city', label: '🇮🇳 Indian City' },
      { value: 'indian_state', label: '🇮🇳 Indian State' },
      { value: 'indian_upi', label: '🇮🇳 UPI ID' },
      { value: 'indian_vehicle', label: '🇮🇳 Vehicle Number' },
    ]}
  ];

  function buildTypeSelect(selectedVal) {
    let html = '';
    COL_TYPES.forEach(g => {
      html += `<optgroup label="${g.group}">`;
      g.types.forEach(t => { html += `<option value="${t.value}" ${t.value === selectedVal ? 'selected' : ''}>${t.label}</option>`; });
      html += '</optgroup>';
    });
    return html;
  }

  // ===== COLUMN UI =====
  function addColumn(name, type, options = {}) {
    const id = 'col_' + (colIdCounter++);
    columns.push({ id, name, type, options });
    renderColumns();
    return id;
  }

  function renderColumns() {
    const list = document.getElementById('columns-list');
    list.innerHTML = '';
    columns.forEach((col, idx) => {
      const div = document.createElement('div');
      div.className = 'col-item';
      div.dataset.id = col.id;
      div.innerHTML = `
        <div class="col-item-hdr">
          <span class="col-item-name">${col.name}</span>
          <span class="col-item-type">${col.type}</span>
          <button class="col-item-del" data-idx="${idx}" title="Delete">✕</button>
        </div>
      `;
      div.querySelector('.col-item-del').addEventListener('click', (e) => {
        e.stopPropagation();
        columns.splice(idx, 1);
        renderColumns();
        renderTable();
      });
      // Only toggle on HEADER click, not on form elements
      div.querySelector('.col-item-hdr').addEventListener('click', (e) => {
        if (e.target.closest('.col-item-del')) return;
        toggleColumnEdit(div, col, idx);
      });
      list.appendChild(div);
    });
    updateChartColumns();
    updateMaskingUI();
  }

  function toggleColumnEdit(div, col, idx) {
    if (div.classList.contains('editing')) {
      div.classList.remove('editing');
      const form = div.querySelector('.col-edit-form');
      if (form) form.remove();
      return;
    }
    document.querySelectorAll('.col-item.editing').forEach(d => {
      d.classList.remove('editing');
      const f = d.querySelector('.col-edit-form');
      if (f) f.remove();
    });
    div.classList.add('editing');

    const form = document.createElement('div');
    form.className = 'col-edit-form';
    // Stop propagation on form so clicking inputs/selects doesn't toggle
    form.addEventListener('click', (e) => e.stopPropagation());

    let extraFields = '';
    if (col.type === 'number' || col.type === 'decimal') {
      extraFields = `
        <div class="form-group"><label class="form-label">Min</label><input type="number" class="form-input" data-opt="min" value="${col.options.min || 1}"></div>
        <div class="form-group"><label class="form-label">Max</label><input type="number" class="form-input" data-opt="max" value="${col.options.max || 1000}"></div>`;
    }
    if (col.type === 'date') {
      extraFields = `
        <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-input" data-opt="startDate" value="${col.options.startDate || '2020-01-01'}"></div>
        <div class="form-group"><label class="form-label">End Date</label><input type="date" class="form-input" data-opt="endDate" value="${col.options.endDate || '2025-12-31'}"></div>`;
    }
    if (col.type === 'sequence') {
      extraFields = `
        <div class="form-group"><label class="form-label">Start</label><input type="number" class="form-input" data-opt="start" value="${col.options.start || 1}"></div>
        <div class="form-group"><label class="form-label">Step</label><input type="number" class="form-input" data-opt="step" value="${col.options.step || 1}"></div>`;
    }
    if (col.type === 'custom_list') {
      extraFields = `<div class="form-group"><label class="form-label">Items (comma separated)</label><input type="text" class="form-input" data-opt="items" value="${col.options.items || 'Option A,Option B,Option C'}"></div>`;
    }
    if (col.type === 'regex') {
      extraFields = `<div class="form-group"><label class="form-label">Pattern</label><input type="text" class="form-input" data-opt="pattern" value="${col.options.pattern || '[A-Z]{3}-[0-9]{4}'}" placeholder="[A-Z]{3}-[0-9]{4}"></div>`;
    }
    if (col.type === 'formula') {
      extraFields = `<div class="form-group"><label class="form-label">Formula (use column names)</label><input type="text" class="form-input" data-opt="formula" value="${col.options.formula || ''}" placeholder="Price * Qty * 0.18"></div>`;
    }

    form.innerHTML = `
      <div class="form-group"><label class="form-label">Column Name</label><input type="text" class="form-input" id="edit-name-${col.id}" value="${col.name}"></div>
      <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="edit-type-${col.id}">${buildTypeSelect(col.type)}</select></div>
      ${extraFields}
    `;
    div.appendChild(form);

    // Listeners
    form.querySelector(`#edit-name-${col.id}`).addEventListener('input', (e) => {
      col.name = e.target.value;
      div.querySelector('.col-item-name').textContent = e.target.value;
    });
    form.querySelector(`#edit-type-${col.id}`).addEventListener('change', (e) => {
      col.type = e.target.value;
      div.querySelector('.col-item-type').textContent = e.target.value;
      div.classList.remove('editing');
      form.remove();
      toggleColumnEdit(div, col, idx); // Re-render edit form with new type options
    });
    form.querySelectorAll('[data-opt]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        col.options[e.target.dataset.opt] = e.target.value;
      });
    });
  }

  document.getElementById('btn-add-col').addEventListener('click', () => {
    addColumn('Column_' + (columns.length + 1), 'text');
  });

  // ===== TEMPLATES =====
  const TEMPLATES = {
    employees: [
      { name: 'EmpID', type: 'sequence', options: { start: 1001, step: 1 } },
      { name: 'Name', type: 'name' },
      { name: 'Email', type: 'email' },
      { name: 'Phone', type: 'phone' },
      { name: 'Department', type: 'custom_list', options: { items: 'Engineering,Marketing,Sales,HR,Finance,Operations' } },
      { name: 'Salary', type: 'number', options: { min: 30000, max: 150000 } },
      { name: 'JoinDate', type: 'date', options: { startDate: '2015-01-01', endDate: '2024-12-31' } },
      { name: 'Active', type: 'boolean' }
    ],
    products: [
      { name: 'ProductID', type: 'regex', options: { pattern: 'PRD-[A-Z]{2}[0-9]{4}' } },
      { name: 'ProductName', type: 'custom_list', options: { items: 'Laptop,Phone,Tablet,Headphones,Keyboard,Mouse,Monitor,Speaker,Webcam,Charger,Cable,Stand' } },
      { name: 'Category', type: 'custom_list', options: { items: 'Electronics,Accessories,Peripherals,Audio,Display' } },
      { name: 'Price', type: 'decimal', options: { min: 499, max: 99999, decimals: 2 } },
      { name: 'Stock', type: 'number', options: { min: 0, max: 500 } },
      { name: 'SKU', type: 'uuid' }
    ],
    students: [
      { name: 'RollNo', type: 'sequence', options: { start: 1, step: 1 } },
      { name: 'Name', type: 'indian_name' },
      { name: 'Class', type: 'custom_list', options: { items: '9th,10th,11th,12th' } },
      { name: 'Section', type: 'custom_list', options: { items: 'A,B,C,D' } },
      { name: 'Marks', type: 'number', options: { min: 35, max: 100 } },
      { name: 'Phone', type: 'indian_phone' },
      { name: 'City', type: 'indian_city' }
    ],
    invoices: [
      { name: 'InvoiceNo', type: 'regex', options: { pattern: 'INV-[0-9]{6}' } },
      { name: 'Date', type: 'date' },
      { name: 'Customer', type: 'indian_name' },
      { name: 'Item', type: 'custom_list', options: { items: 'Web Development,App Development,SEO Service,Cloud Hosting,Consulting,Maintenance' } },
      { name: 'Quantity', type: 'number', options: { min: 1, max: 20 } },
      { name: 'UnitPrice', type: 'decimal', options: { min: 500, max: 50000 } },
      { name: 'GSTIN', type: 'indian_gstin' }
    ],
    contacts: [
      { name: 'Name', type: 'name' },
      { name: 'Email', type: 'email' },
      { name: 'Phone', type: 'phone' },
      { name: 'Company', type: 'custom_list', options: { items: 'Google,Microsoft,Amazon,Apple,Meta,Netflix,Tesla,Spotify' } },
      { name: 'City', type: 'custom_list', options: { items: 'New York,London,Tokyo,Berlin,Sydney,Paris,Toronto,Dubai' } },
    ],
    'indian-customers': [
      { name: 'CustID', type: 'sequence', options: { start: 1, step: 1 } },
      { name: 'Name', type: 'indian_name' },
      { name: 'Phone', type: 'indian_phone' },
      { name: 'Email', type: 'indian_email' },
      { name: 'PAN', type: 'indian_pan' },
      { name: 'Aadhaar', type: 'indian_aadhaar' },
      { name: 'City', type: 'indian_city' },
      { name: 'State', type: 'indian_state' },
      { name: 'PIN', type: 'indian_pin' },
      { name: 'UPI', type: 'indian_upi' }
    ],
    'indian-businesses': [
      { name: 'BusinessID', type: 'regex', options: { pattern: 'BIZ-[0-9]{5}' } },
      { name: 'OwnerName', type: 'indian_name' },
      { name: 'GSTIN', type: 'indian_gstin' },
      { name: 'PAN', type: 'indian_pan' },
      { name: 'IFSC', type: 'indian_ifsc' },
      { name: 'Phone', type: 'indian_phone' },
      { name: 'City', type: 'indian_city' },
      { name: 'State', type: 'indian_state' },
      { name: 'Vehicle', type: 'indian_vehicle' }
    ]
  };

  document.getElementById('template-select').addEventListener('change', (e) => {
    const key = e.target.value;
    if (key === 'none') return;
    columns = [];
    colIdCounter = 0;
    TEMPLATES[key].forEach(t => addColumn(t.name, t.type, { ...t.options }));
    renderColumns();
    JoogadTools.showToast('Template loaded: ' + e.target.options[e.target.selectedIndex].text, 'info');
  });

  // ===== GENERATE DATA =====
  document.getElementById('btn-generate').addEventListener('click', generateData);

  function generateData() {
    if (columns.length === 0) { JoogadTools.showToast('Add at least one column', 'warning'); return; }
    const rowCount = Math.min(parseInt(document.getElementById('row-count').value) || 10, 10000);
    tableData = [];

    for (let i = 0; i < rowCount; i++) {
      const row = {};
      // First pass: non-formula columns
      columns.forEach(col => {
        if (col.type !== 'formula') {
          row[col.id] = generateValue(col, i, row);
        }
      });
      // Second pass: formula columns
      columns.forEach(col => {
        if (col.type === 'formula') {
          row[col.id] = generateValue(col, i, row);
        }
      });
      tableData.push(row);
    }

    renderTable();
    updateStats();
    JoogadTools.showToast(`Generated ${rowCount} rows!`, 'success');
  }

  // ===== TABLE RENDERING =====
  function renderTable() {
    const thead = document.getElementById('csv-thead').querySelector('tr');
    const tbody = document.getElementById('csv-tbody');
    const empty = document.getElementById('table-empty');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (columns.length === 0 || tableData.length === 0) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    // Header
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.name;
      thead.appendChild(th);
    });

    // Rows (max 500 for performance)
    const displayRows = tableData.slice(0, 500);
    displayRows.forEach((row, ri) => {
      const tr = document.createElement('tr');
      columns.forEach(col => {
        const td = document.createElement('td');
        td.textContent = row[col.id] !== undefined ? row[col.id] : '';
        td.contentEditable = 'true';
        td.dataset.row = ri;
        td.dataset.col = col.id;
        td.addEventListener('blur', (e) => {
          tableData[ri][col.id] = e.target.textContent;
        });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    if (tableData.length > 500) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length;
      td.textContent = `... and ${tableData.length - 500} more rows (showing first 500)`;
      td.style.textAlign = 'center';
      td.style.color = 'var(--text-muted)';
      td.style.fontStyle = 'italic';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    updateStats();
  }

  // Add/Remove rows
  document.getElementById('btn-add-row').addEventListener('click', () => {
    if (columns.length === 0) return;
    const row = {};
    columns.forEach(col => { row[col.id] = generateValue(col, tableData.length, row); });
    tableData.push(row);
    renderTable();
  });

  document.getElementById('btn-del-row').addEventListener('click', () => {
    if (tableData.length === 0) return;
    tableData.pop();
    renderTable();
  });

  // Shuffle
  document.getElementById('btn-shuffle').addEventListener('click', () => {
    if (tableData.length < 2) return;
    for (let i = tableData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tableData[i], tableData[j]] = [tableData[j], tableData[i]];
    }
    renderTable();
    JoogadTools.showToast('Data shuffled!', 'info');
  });

  // Stats
  function updateStats() {
    document.getElementById('stat-rows').textContent = tableData.length + ' rows';
    document.getElementById('stat-cols').textContent = columns.length + ' cols';
    const csvStr = exportCSV(',', true);
    const bytes = new Blob([csvStr]).size;
    document.getElementById('stat-size').textContent = bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
  }

  // ===== IMPORT CSV =====
  document.getElementById('import-csv').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 1) return;
      const delimiter = text.includes('\t') ? '\t' : ',';
      const headers = parseCSVLine(lines[0], delimiter);
      columns = [];
      colIdCounter = 0;
      headers.forEach(h => addColumn(h.trim(), 'text'));
      tableData = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseCSVLine(lines[i], delimiter);
        const row = {};
        columns.forEach((col, ci) => { row[col.id] = vals[ci] || ''; });
        tableData.push(row);
      }
      renderColumns();
      renderTable();
      updateMaskingUI();
      JoogadTools.showToast(`Imported ${tableData.length} rows, ${columns.length} columns`, 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  function parseCSVLine(line, delim = ',') {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; } }
        else { current += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === delim) { result.push(current); current = ''; }
        else { current += c; }
      }
    }
    result.push(current);
    return result;
  }

  // ===== EXPORT FUNCTIONS =====
  function exportCSV(delimiter, includeHeader) {
    const escape = (v) => {
      const s = String(v);
      if (s.includes(delimiter) || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    let csv = '';
    if (includeHeader) { csv = columns.map(c => escape(c.name)).join(delimiter) + '\n'; }
    csv += tableData.map(row => columns.map(c => escape(row[c.id] !== undefined ? row[c.id] : '')).join(delimiter)).join('\n');
    return csv;
  }

  function exportJSON() {
    return JSON.stringify(tableData.map(row => {
      const obj = {};
      columns.forEach(c => { obj[c.name] = row[c.id]; });
      return obj;
    }), null, 2);
  }

  function exportSQL() {
    const tableName = 'data_table';
    const colDefs = columns.map(c => {
      let sqlType = 'TEXT';
      if (['number','sequence'].includes(c.type)) sqlType = 'INTEGER';
      else if (c.type === 'decimal') sqlType = 'DECIMAL(10,2)';
      else if (c.type === 'boolean') sqlType = 'BOOLEAN';
      else if (c.type === 'date') sqlType = 'DATE';
      return `  ${c.name.replace(/\s/g,'_')} ${sqlType}`;
    }).join(',\n');
    let sql = `CREATE TABLE ${tableName} (\n${colDefs}\n);\n\n`;
    tableData.forEach(row => {
      const vals = columns.map(c => {
        const v = row[c.id];
        if (['number','sequence','decimal'].includes(c.type)) return v;
        if (c.type === 'boolean') return v;
        return "'" + String(v).replace(/'/g, "''") + "'";
      }).join(', ');
      sql += `INSERT INTO ${tableName} VALUES (${vals});\n`;
    });
    return sql;
  }

  function exportMarkdown() {
    if (columns.length === 0) return '';
    let md = '| ' + columns.map(c => c.name).join(' | ') + ' |\n';
    md += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
    tableData.forEach(row => {
      md += '| ' + columns.map(c => String(row[c.id] || '')).join(' | ') + ' |\n';
    });
    return md;
  }

  function exportHTMLTable() {
    let html = '<table border="1" cellpadding="6" cellspacing="0">\n<thead>\n<tr>\n';
    columns.forEach(c => { html += `  <th>${c.name}</th>\n`; });
    html += '</tr>\n</thead>\n<tbody>\n';
    tableData.forEach(row => {
      html += '<tr>\n';
      columns.forEach(c => { html += `  <td>${row[c.id] || ''}</td>\n`; });
      html += '</tr>\n';
    });
    html += '</tbody>\n</table>';
    return html;
  }

  async function saveFile(blob, filename) {
    if (window.showSaveFilePicker) {
      try {
        const ext = filename.split('.').pop();
        const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: ext.toUpperCase(), accept: { 'application/octet-stream': ['.' + ext] } }] });
        const w = await handle.createWritable(); await w.write(blob); await w.close();
        JoogadTools.showToast(filename + ' saved!', 'success'); return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    JoogadTools.showToast(filename + ' downloaded!', 'success');
  }

  // Export buttons
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (!tableData.length) return;
    const d = document.getElementById('export-delimiter').value;
    const h = document.getElementById('export-header').checked;
    const ext = d === '\t' ? 'tsv' : 'csv';
    saveFile(new Blob([exportCSV(d, h)]), 'data.' + ext);
  });
  document.getElementById('btn-export-json').addEventListener('click', () => {
    if (!tableData.length) return;
    saveFile(new Blob([exportJSON()]), 'data.json');
  });
  document.getElementById('btn-export-sql').addEventListener('click', () => {
    if (!tableData.length) return;
    const sql = exportSQL();
    document.getElementById('sql-output').value = sql;
    document.getElementById('sql-preview').classList.remove('hidden');
    saveFile(new Blob([sql]), 'data.sql');
  });
  document.getElementById('btn-export-md').addEventListener('click', () => {
    if (!tableData.length) return;
    saveFile(new Blob([exportMarkdown()]), 'data.md');
  });
  document.getElementById('btn-export-html').addEventListener('click', () => {
    if (!tableData.length) return;
    saveFile(new Blob([exportHTMLTable()]), 'data.html');
  });
  document.getElementById('btn-copy-csv').addEventListener('click', () => {
    if (!tableData.length) return;
    JoogadTools.copyToClipboard(exportCSV(',', true));
  });
  document.getElementById('btn-copy-json').addEventListener('click', () => {
    if (!tableData.length) return;
    JoogadTools.copyToClipboard(exportJSON());
  });

  // ===== DATA MASKING =====
  function updateMaskingUI() {
    const container = document.getElementById('masking-options');
    const btn = document.getElementById('btn-apply-mask');
    if (columns.length === 0 || tableData.length === 0) {
      container.innerHTML = '<p class="text-muted">Import a CSV or generate data, then select columns to mask.</p>';
      btn.classList.add('hidden');
      return;
    }
    btn.classList.remove('hidden');
    container.innerHTML = '';
    columns.forEach(col => {
      const div = document.createElement('div');
      div.className = 'mask-col-item';
      div.innerHTML = `
        <label><input type="checkbox" data-mask-col="${col.id}"> ${col.name}</label>
        <select class="form-select" data-mask-type="${col.id}" style="width:auto;font-size:12px;">
          <option value="partial">Partial (a***z)</option>
          <option value="hash">Hash (####)</option>
          <option value="random">Replace with Random</option>
          <option value="redact">Redact ([REDACTED])</option>
        </select>
      `;
      container.appendChild(div);
    });
  }

  document.getElementById('btn-apply-mask').addEventListener('click', () => {
    const container = document.getElementById('masking-options');
    columns.forEach(col => {
      const cb = container.querySelector(`[data-mask-col="${col.id}"]`);
      const type = container.querySelector(`[data-mask-type="${col.id}"]`);
      if (!cb || !cb.checked) return;
      const maskType = type.value;
      tableData.forEach(row => {
        const val = String(row[col.id] || '');
        switch (maskType) {
          case 'partial':
            if (val.length <= 2) row[col.id] = '***';
            else row[col.id] = val[0] + '*'.repeat(Math.max(val.length - 2, 3)) + val[val.length - 1];
            break;
          case 'hash': row[col.id] = '#'.repeat(val.length || 4); break;
          case 'random': row[col.id] = generateValue(col, 0, {}); break;
          case 'redact': row[col.id] = '[REDACTED]'; break;
        }
      });
    });
    renderTable();
    JoogadTools.showToast('Data masked!', 'success');
  });

  // ===== CHART =====
  function updateChartColumns() {
    const sel = document.getElementById('chart-column');
    sel.innerHTML = '<option value="">— Select column —</option>';
    columns.forEach(col => {
      if (['number','decimal','sequence'].includes(col.type)) {
        sel.innerHTML += `<option value="${col.id}">${col.name}</option>`;
      }
    });
  }

  document.getElementById('btn-draw-chart').addEventListener('click', () => {
    const colId = document.getElementById('chart-column').value;
    if (!colId || !tableData.length) { JoogadTools.showToast('Select a numeric column first', 'warning'); return; }
    const chartType = document.getElementById('chart-type').value;
    const cvs = document.getElementById('chart-canvas');
    cvs.classList.remove('hidden');
    const ctx = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);

    const values = tableData.slice(0, 30).map(r => parseFloat(r[colId]) || 0);
    const maxVal = Math.max(...values, 1);
    const pad = 50;

    // Background
    ctx.fillStyle = 'rgba(10,14,26,0.9)';
    ctx.fillRect(0, 0, W, H);

    const colors = ['#6C63FF','#4ECDC4','#FF6B6B','#F093FB','#FFD93D','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8'];

    if (chartType === 'bar') {
      const barW = Math.max((W - pad * 2) / values.length - 4, 8);
      values.forEach((v, i) => {
        const bh = ((v / maxVal) * (H - pad * 2));
        const x = pad + i * ((W - pad * 2) / values.length) + 2;
        const y = H - pad - bh;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(x, y, barW, bh);
        // Value label
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(v, x + barW / 2, y - 4);
        ctx.fillText(i + 1, x + barW / 2, H - pad + 14);
      });
    } else { // horizontal bar
      const barH = Math.max((H - pad * 2) / values.length - 4, 10);
      values.forEach((v, i) => {
        const bw = (v / maxVal) * (W - pad * 2);
        const y = pad + i * ((H - pad * 2) / values.length) + 2;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(pad, y, bw, barH);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(v, pad + bw + 6, y + barH / 2);
      });
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad, H - pad);
    ctx.stroke();
  });

  // ===== SAVE/LOAD SCHEMA =====
  const SCHEMA_KEY = 'joogadtools_csv_schemas';

  document.getElementById('btn-save-schema').addEventListener('click', () => {
    if (columns.length === 0) { JoogadTools.showToast('No columns to save', 'warning'); return; }
    const name = prompt('Schema name:', 'My Schema');
    if (!name) return;
    const schemas = JSON.parse(localStorage.getItem(SCHEMA_KEY) || '{}');
    schemas[name] = columns.map(c => ({ name: c.name, type: c.type, options: { ...c.options } }));
    localStorage.setItem(SCHEMA_KEY, JSON.stringify(schemas));
    JoogadTools.showToast('Schema saved: ' + name, 'success');
  });

  document.getElementById('btn-load-schema').addEventListener('click', () => {
    const schemas = JSON.parse(localStorage.getItem(SCHEMA_KEY) || '{}');
    const names = Object.keys(schemas);
    if (names.length === 0) { JoogadTools.showToast('No saved schemas. Save one first.', 'warning'); return; }
    const name = prompt('Enter schema name to load:\n\nSaved: ' + names.join(', '));
    if (!name || !schemas[name]) { JoogadTools.showToast('Schema not found', 'error'); return; }
    columns = []; colIdCounter = 0;
    schemas[name].forEach(c => addColumn(c.name, c.type, c.options || {}));
    renderColumns();
    JoogadTools.showToast('Schema loaded: ' + name, 'success');
  });

  // Initialize with empty state
  renderColumns();
});
