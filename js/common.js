// ============================================
// JoogadTools.online — Common Utilities
// ============================================

const JoogadTools = {
  // ---- Header Component ----
  renderHeader(currentPath = '') {
    const header = document.createElement('header');
    header.className = 'site-header';
    header.id = 'site-header';
    header.innerHTML = `
      <div class="header-inner">
        <a href="${this.getBasePath(currentPath)}index.html" class="logo" id="logo-link">
          <div class="logo-icon">J</div>
          <div class="logo-text"><span>Joogad</span>Tools</div>
        </a>
        <nav class="nav-links" id="nav-links">
          <a href="${this.getBasePath(currentPath)}index.html" id="nav-home">Home</a>
          <a href="${this.getBasePath(currentPath)}index.html#tools" id="nav-tools">Tools</a>
          <a href="${this.getBasePath(currentPath)}index.html#features" id="nav-about">About</a>
        </nav>
        <div class="menu-toggle" id="menu-toggle">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    document.body.prepend(header);

    // Mobile menu toggle
    const toggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
      header.style.background = window.scrollY > 50
        ? 'rgba(10, 14, 26, 0.95)'
        : 'rgba(10, 14, 26, 0.8)';
    });
  },

  // ---- Footer Component ----
  renderFooter(currentPath = '') {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.id = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-links">
          <a href="${this.getBasePath(currentPath)}tools/qr-generator/index.html" id="footer-qr">QR Generator</a>
          <a href="${this.getBasePath(currentPath)}tools/password-generator/index.html" id="footer-password">Password Generator</a>
          <a href="${this.getBasePath(currentPath)}tools/case-converter/index.html" id="footer-case">Case Converter</a>
          <a href="${this.getBasePath(currentPath)}tools/color-converter/index.html" id="footer-color">Color Converter</a>
          <a href="${this.getBasePath(currentPath)}tools/json-csv-converter/index.html" id="footer-json">JSON/CSV Converter</a>
          <a href="${this.getBasePath(currentPath)}tools/csv-generator/index.html" id="footer-csv-gen">CSV Generator</a>
          <a href="${this.getBasePath(currentPath)}tools/emi-calculator/index.html" id="footer-emi">EMI Calculator</a>
          <a href="${this.getBasePath(currentPath)}tools/gst-calculator/index.html" id="footer-gst">GST Calculator</a>
          <a href="${this.getBasePath(currentPath)}tools/image-compressor/index.html" id="footer-image">Image Compressor</a>
          <a href="${this.getBasePath(currentPath)}tools/word-counter/index.html" id="footer-word">Word Counter</a>
          <a href="${this.getBasePath(currentPath)}tools/hash-generator/index.html" id="footer-hash">Hash Generator</a>
          <a href="${this.getBasePath(currentPath)}tools/handwriting-to-text/index.html" id="footer-ocr">Handwriting to Text</a>
        </div>
        <p class="footer-copyright">© ${new Date().getFullYear()} JoogadTools.online — Free Online Tools for Everyone</p>
      </div>
    `;

    document.body.appendChild(footer);
  },

  // ---- Toast Notification System ----
  toastContainer: null,

  showToast(message, type = 'info', duration = 3000) {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      this.toastContainer.id = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ---- Copy to Clipboard ----
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!', 'success');
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.showToast('Copied to clipboard!', 'success');
        document.body.removeChild(textarea);
        return true;
      } catch (e) {
        document.body.removeChild(textarea);
        this.showToast('Failed to copy', 'error');
        return false;
      }
    }
  },

  // ---- Download File Utility ----
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Downloaded ${filename}`, 'success');
  },

  // ---- Download Canvas as Image ----
  downloadCanvas(canvas, filename = 'image.png') {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Downloaded ${filename}`, 'success');
  },

  // ---- Tab System ----
  initTabs(containerSelector = '.tabs') {
    const containers = document.querySelectorAll(containerSelector);
    containers.forEach(container => {
      const buttons = container.querySelectorAll('.tab-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          // Deactivate all buttons
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          // Show target content
          const parent = container.closest('.tabs-wrapper') || container.parentElement;
          parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          const targetEl = parent.querySelector(`#${target}`);
          if (targetEl) targetEl.classList.add('active');
        });
      });
    });
  },

  // ---- Helper: Get base path ----
  getBasePath(currentPath) {
    if (!currentPath || currentPath === '/') return './';
    const depth = (currentPath.match(/\//g) || []).length;
    return '../'.repeat(depth);
  },

  // ---- Monetag Ad Injection ----
  injectAd(containerId, adCode) {
    const container = document.getElementById(containerId);
    if (container && adCode) {
      container.innerHTML = adCode;
      // Execute any scripts in the ad code
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode.replaceChild(newScript, script);
      });
    }
  },

  // ---- Debounce Utility ----
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // ---- Analytics / Tracking System ----
  initTracking() {
    // 👇 Replace 'G-XXXXXXXXXX' with your actual Google Analytics Measurement ID
    const MEASUREMENT_ID = 'G-XXXXXXXXXX'; 
    
    if (MEASUREMENT_ID === 'G-XXXXXXXXXX') {
      console.log('Analytics tracking is NOT active. Please put your Google Analytics ID (Measurement ID) in js/common.js');
      return;
    }

    // Inject Google Analytics (gtag.js) script into the <head>
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID);
    
    console.log(`Analytics initialized for ID: ${MEASUREMENT_ID}`);
  }
};

// Initialize tracking automatically on all pages
JoogadTools.initTracking();
