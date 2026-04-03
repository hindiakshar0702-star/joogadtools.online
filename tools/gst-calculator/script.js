// GST Calculator Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/gst-calculator');
  JoogadTools.renderFooter('tools/gst-calculator');

  let rate = 5, gstType = 'intra', calcType = 'exclusive';

  // Rate buttons
  document.querySelectorAll('.rate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rate = parseFloat(btn.dataset.rate);
      document.getElementById('custom-rate').value = '';
      calculate();
    });
  });

  document.getElementById('custom-rate').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) {
      rate = v;
      document.querySelectorAll('.rate-btn').forEach(b => b.classList.remove('active'));
      calculate();
    }
  });

  // Toggle buttons
  document.querySelectorAll('.toggle-group').forEach(group => {
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.type) gstType = btn.dataset.type;
        if (btn.dataset.calc) calcType = btn.dataset.calc;
        calculate();
      });
    });
  });

  document.getElementById('gst-amount').addEventListener('input', calculate);
  document.getElementById('btn-calc').addEventListener('click', calculate);

  function calculate() {
    const amount = parseFloat(document.getElementById('gst-amount').value) || 0;
    let base, gstAmount, total;

    if (calcType === 'exclusive') {
      base = amount;
      gstAmount = base * rate / 100;
      total = base + gstAmount;
    } else {
      total = amount;
      base = total / (1 + rate / 100);
      gstAmount = total - base;
    }

    const fmt = (v) => '₹ ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    document.getElementById('r-base').textContent = fmt(base);
    document.getElementById('r-total').textContent = fmt(total);
    document.getElementById('r-gst').textContent = fmt(gstAmount);

    if (gstType === 'intra') {
      document.getElementById('row-cgst').classList.remove('hidden');
      document.getElementById('row-sgst').classList.remove('hidden');
      document.getElementById('row-igst').classList.add('hidden');
      document.getElementById('r-cgst').textContent = fmt(gstAmount / 2) + ` (${rate / 2}%)`;
      document.getElementById('r-sgst').textContent = fmt(gstAmount / 2) + ` (${rate / 2}%)`;
    } else {
      document.getElementById('row-cgst').classList.add('hidden');
      document.getElementById('row-sgst').classList.add('hidden');
      document.getElementById('row-igst').classList.remove('hidden');
      document.getElementById('r-igst').textContent = fmt(gstAmount) + ` (${rate}%)`;
    }
  }

  document.getElementById('btn-copy-result').addEventListener('click', () => {
    const lines = [];
    document.querySelectorAll('.gst-row:not(.hidden)').forEach(row => {
      const spans = row.querySelectorAll('span');
      if (spans.length === 2) lines.push(spans[0].textContent + ': ' + spans[1].textContent);
    });
    JoogadTools.copyToClipboard(lines.join('\n'));
  });

  calculate();
});
