// Color Converter — Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/color-converter');
  JoogadTools.renderFooter('tools/color-converter');

  // ---- Color Math Utilities ----
  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    return [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: Math.round(((1 - r - k) / (1 - k)) * 100),
      m: Math.round(((1 - g - k) / (1 - k)) * 100),
      y: Math.round(((1 - b - k) / (1 - k)) * 100),
      k: Math.round(k * 100)
    };
  }

  function cmykToRgb(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return {
      r: Math.round(255 * (1 - c) * (1 - k)),
      g: Math.round(255 * (1 - m) * (1 - k)),
      b: Math.round(255 * (1 - y) * (1 - k))
    };
  }

  // ---- Contrast Ratio (WCAG) ----
  function luminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function contrastRatio(rgb1, rgb2) {
    const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ---- DOM Elements ----
  const picker = document.getElementById('color-picker');
  const swatch = document.getElementById('color-swatch');
  const hexInput = document.getElementById('input-hex');
  const rInput = document.getElementById('input-r');
  const gInput = document.getElementById('input-g');
  const bInput = document.getElementById('input-b');
  const hInput = document.getElementById('input-h');
  const sInput = document.getElementById('input-s');
  const lInput = document.getElementById('input-l');
  const cInput = document.getElementById('input-c');
  const mInput = document.getElementById('input-m');
  const yInput = document.getElementById('input-y');
  const kInput = document.getElementById('input-k');
  const cssInput = document.getElementById('input-css');

  // ---- Update all from RGB source ----
  let updating = false;

  function updateAllFromRgb(r, g, b, source) {
    if (updating) return;
    updating = true;

    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    const cmyk = rgbToCmyk(r, g, b);

    // Update inputs (skip source to prevent loop)
    if (source !== 'hex') hexInput.value = hex;
    if (source !== 'rgb') { rInput.value = r; gInput.value = g; bInput.value = b; }
    if (source !== 'hsl') { hInput.value = hsl.h; sInput.value = hsl.s; lInput.value = hsl.l; }
    if (source !== 'cmyk') { cInput.value = cmyk.c; mInput.value = cmyk.m; yInput.value = cmyk.y; kInput.value = cmyk.k; }
    if (source !== 'picker') picker.value = '#' + hex;

    cssInput.value = `rgb(${r}, ${g}, ${b})`;
    swatch.style.background = '#' + hex;

    // Swatch label contrast
    const lum = luminance(r, g, b);
    const label = swatch.querySelector('.swatch-label');
    if (label) label.style.color = lum > 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';

    // Update contrast checker
    updateContrast(r, g, b);

    // Update palettes
    updatePalettes(hsl.h, hsl.s, hsl.l);

    updating = false;
  }

  // ---- Contrast Checker ----
  function updateContrast(r, g, b) {
    const color = { r, g, b };
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };

    const whiteRatio = contrastRatio(color, white);
    const blackRatio = contrastRatio(color, black);

    const hexStr = '#' + rgbToHex(r, g, b);

    // Update preview
    const onWhite = document.getElementById('contrast-on-white');
    const onBlack = document.getElementById('contrast-on-black');
    onWhite.style.color = hexStr;
    onBlack.style.color = hexStr;

    // Ratios
    document.getElementById('contrast-white-ratio').textContent = whiteRatio.toFixed(2) + ':1';
    document.getElementById('contrast-black-ratio').textContent = blackRatio.toFixed(2) + ':1';

    // AA pass/fail
    const whiteAA = document.getElementById('contrast-white-aa');
    const blackAA = document.getElementById('contrast-black-aa');
    whiteAA.textContent = whiteRatio >= 4.5 ? 'AA ✓' : whiteRatio >= 3 ? 'AA Large' : 'Fail ✕';
    whiteAA.className = `badge ${whiteRatio >= 4.5 ? 'badge--success' : whiteRatio >= 3 ? 'badge--warning' : 'badge--error'}`;
    blackAA.textContent = blackRatio >= 4.5 ? 'AA ✓' : blackRatio >= 3 ? 'AA Large' : 'Fail ✕';
    blackAA.className = `badge ${blackRatio >= 4.5 ? 'badge--success' : blackRatio >= 3 ? 'badge--warning' : 'badge--error'}`;
  }

  // ---- Palette Suggestions ----
  function updatePalettes(h, s, l) {
    function makeSwatches(container, colors) {
      const el = document.getElementById(container);
      el.innerHTML = '';
      colors.forEach(([ch, cs, cl]) => {
        const rgb = hslToRgb(ch % 360 < 0 ? ch % 360 + 360 : ch % 360, cs, cl);
        const hex = '#' + rgbToHex(rgb.r, rgb.g, rgb.b);
        const div = document.createElement('div');
        div.className = 'palette-color';
        div.style.background = hex;
        div.title = hex;
        div.addEventListener('click', () => {
          updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'palette');
          JoogadTools.showToast(`Color set to ${hex}`, 'info');
        });
        el.appendChild(div);
      });
    }

    // Complementary
    makeSwatches('palette-complementary', [
      [h, s, l],
      [(h + 180) % 360, s, l]
    ]);

    // Analogous
    makeSwatches('palette-analogous', [
      [(h - 30 + 360) % 360, s, l],
      [h, s, l],
      [(h + 30) % 360, s, l]
    ]);

    // Triadic
    makeSwatches('palette-triadic', [
      [h, s, l],
      [(h + 120) % 360, s, l],
      [(h + 240) % 360, s, l]
    ]);

    // Shades
    makeSwatches('palette-shades', [
      [h, s, Math.min(100, l + 30)],
      [h, s, Math.min(100, l + 15)],
      [h, s, l],
      [h, s, Math.max(0, l - 15)],
      [h, s, Math.max(0, l - 30)]
    ]);
  }

  // ---- Event Listeners ----

  // Color picker
  picker.addEventListener('input', (e) => {
    const rgb = hexToRgb(e.target.value);
    updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'picker');
  });

  // HEX input
  hexInput.addEventListener('input', () => {
    const val = hexInput.value.replace(/[^0-9A-Fa-f]/g, '');
    if (val.length === 6 || val.length === 3) {
      const rgb = hexToRgb(val);
      updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hex');
    }
  });

  // RGB inputs
  [rInput, gInput, bInput].forEach(inp => {
    inp.addEventListener('input', () => {
      updateAllFromRgb(
        parseInt(rInput.value) || 0,
        parseInt(gInput.value) || 0,
        parseInt(bInput.value) || 0,
        'rgb'
      );
    });
  });

  // HSL inputs
  [hInput, sInput, lInput].forEach(inp => {
    inp.addEventListener('input', () => {
      const rgb = hslToRgb(
        parseInt(hInput.value) || 0,
        parseInt(sInput.value) || 0,
        parseInt(lInput.value) || 0
      );
      updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'hsl');
    });
  });

  // CMYK inputs
  [cInput, mInput, yInput, kInput].forEach(inp => {
    inp.addEventListener('input', () => {
      const rgb = cmykToRgb(
        parseInt(cInput.value) || 0,
        parseInt(mInput.value) || 0,
        parseInt(yInput.value) || 0,
        parseInt(kInput.value) || 0
      );
      updateAllFromRgb(rgb.r, rgb.g, rgb.b, 'cmyk');
    });
  });

  // Copy buttons
  document.querySelectorAll('.copy-format').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      let text = '';
      switch (format) {
        case 'hex': text = '#' + hexInput.value; break;
        case 'rgb': text = `rgb(${rInput.value}, ${gInput.value}, ${bInput.value})`; break;
        case 'hsl': text = `hsl(${hInput.value}, ${sInput.value}%, ${lInput.value}%)`; break;
        case 'cmyk': text = `cmyk(${cInput.value}%, ${mInput.value}%, ${yInput.value}%, ${kInput.value}%)`; break;
        case 'css': text = cssInput.value; break;
      }
      JoogadTools.copyToClipboard(text);
    });
  });

  // Initialize with default color
  updateAllFromRgb(108, 99, 255, 'init');
});
