/// <reference path="../../js/common.d.ts" />
// EMI Calculator Script
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/emi-calculator');
  JoogadTools.renderFooter('tools/emi-calculator');

  const principalInput = document.getElementById('emi-principal');
  const rateSlider = document.getElementById('emi-rate');
  const tenureSlider = document.getElementById('emi-tenure');
  const rateVal = document.getElementById('rate-val');
  const tenureVal = document.getElementById('tenure-val');

  rateSlider.addEventListener('input', () => { rateVal.textContent = rateSlider.value; calculate(); });
  tenureSlider.addEventListener('input', () => { tenureVal.textContent = tenureSlider.value; calculate(); });
  principalInput.addEventListener('input', calculate);
  document.getElementById('btn-calc-emi').addEventListener('click', calculate);

  document.getElementById('loan-type').addEventListener('change', (e) => {
    const presets = { home: [8.5, 20], car: [10, 5], personal: [14, 3], education: [9, 7] };
    const p = presets[e.target.value];
    if (p) { rateSlider.value = p[0]; tenureSlider.value = p[1]; rateVal.textContent = p[0]; tenureVal.textContent = p[1]; calculate(); }
  });

  function fmt(v) { return '₹ ' + Math.round(v).toLocaleString('en-IN'); }

  function calculate() {
    const P = parseFloat(principalInput.value) || 0;
    const annualRate = parseFloat(rateSlider.value) || 0;
    const years = parseInt(tenureSlider.value) || 0;
    const months = years * 12;
    const r = annualRate / 12 / 100;

    let emi = 0, totalInterest = 0, totalPayment = 0;
    if (P > 0 && r > 0 && months > 0) {
      emi = P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
      totalPayment = emi * months;
      totalInterest = totalPayment - P;
    }

    document.getElementById('r-emi').textContent = fmt(emi);
    document.getElementById('r-principal').textContent = fmt(P);
    document.getElementById('r-interest').textContent = fmt(totalInterest);
    document.getElementById('r-total').textContent = fmt(totalPayment);

    drawChart(P, totalInterest);
    buildAmortization(P, r, emi, months);
  }

  function drawChart(principal, interest) {
    const cvs = document.getElementById('emi-chart');
    const ctx = cvs.getContext('2d');
    const W = cvs.width, H = cvs.height;
    ctx.clearRect(0, 0, W, H);
    const total = principal + interest;
    if (total <= 0) return;
    const cx = W / 2, cy = H / 2, radius = Math.min(W, H) / 2 - 20;
    const principalAngle = (principal / total) * 2 * Math.PI;

    // Principal arc
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
    ctx.closePath(); ctx.fillStyle = '#6C63FF'; ctx.fill();

    // Interest arc
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2 + principalAngle, -Math.PI / 2 + 2 * Math.PI);
    ctx.closePath(); ctx.fillStyle = '#FFD93D'; ctx.fill();

    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(10,14,26,0.95)'; ctx.fill();

    // Labels
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Principal', cx, cy - 8); ctx.fillStyle = '#6C63FF';
    ctx.fillText(((principal / total) * 100).toFixed(1) + '%', cx, cy + 8);
    // Legend
    ctx.fillStyle = '#6C63FF'; ctx.fillRect(20, H - 30, 12, 12);
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Principal', 36, H - 20);
    ctx.fillStyle = '#FFD93D'; ctx.fillRect(120, H - 30, 12, 12);
    ctx.fillStyle = '#fff'; ctx.fillText('Interest', 136, H - 20);
  }

  function buildAmortization(P, r, emi, months) {
    const tbody = document.getElementById('amort-body');
    tbody.innerHTML = '';
    if (P <= 0 || r <= 0 || months <= 0) return;
    let balance = P;
    const years = months / 12;
    for (let y = 1; y <= years; y++) {
      let yearPrincipal = 0, yearInterest = 0;
      for (let m = 0; m < 12 && balance > 0; m++) {
        const interest = balance * r;
        const principal = Math.min(emi - interest, balance);
        yearPrincipal += principal;
        yearInterest += interest;
        balance -= principal;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${y}</td><td>${fmt(emi * 12)}</td><td>${fmt(yearPrincipal)}</td><td>${fmt(yearInterest)}</td><td>${fmt(Math.max(balance, 0))}</td>`;
      tbody.appendChild(tr);
    }
  }

  calculate();
});
