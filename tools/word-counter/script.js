/// <reference path="../../js/common.d.ts" />
// Word Counter Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/word-counter');
  JoogadTools.renderFooter('tools/word-counter');
  const input = document.getElementById('wc-input');
  input.addEventListener('input', analyze);

  function analyze() {
    const text = input.value;
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const chars = text.length;
    const charsNS = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
    const readMin = Math.ceil(words.length / 200);
    const speakMin = Math.ceil(words.length / 130);

    document.getElementById('s-words').textContent = words.length;
    document.getElementById('s-chars').textContent = chars;
    document.getElementById('s-chars-ns').textContent = charsNS;
    document.getElementById('s-sentences').textContent = sentences;
    document.getElementById('s-paragraphs').textContent = paragraphs || (text.trim() ? 1 : 0);
    document.getElementById('s-read').textContent = readMin + ' min';
    document.getElementById('s-speak').textContent = speakMin + ' min';

    // Keyword density
    const grid = document.getElementById('keyword-grid');
    if (words.length === 0) { grid.innerHTML = '<p class="text-muted">Type text to see keyword density.</p>'; return; }
    const freq = {};
    const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','must','can','could','of','in','to','for','with','on','at','by','from','as','into','about','it','its','this','that','these','those','i','you','he','she','we','they','me','him','her','us','them','my','your','his','our','their','and','but','or','not','no','so','if','then','than','too','very','just','also','only']);
    words.forEach(w => {
      const lw = w.toLowerCase().replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '');
      if (lw.length > 1 && !stopWords.has(lw)) freq[lw] = (freq[lw] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20);
    grid.innerHTML = sorted.map(([word, count]) => `<div class="kw-item"><span class="kw-word">${word}</span><span class="kw-count">${count} (${(count / words.length * 100).toFixed(1)}%)</span></div>`).join('');
  }
});
