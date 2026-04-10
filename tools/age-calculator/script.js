/// <reference path="../../js/common.d.ts" />
// ============================================
// Age Calculator — Script
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/age-calculator');
  JoogadTools.renderFooter('tools/age-calculator');

  // ── Elements ──
  const dobInput = document.getElementById('dob-input');
  const btnCalc = document.getElementById('btn-calc-age');

  // Set default date (25 years ago)
  const defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 25);
  dobInput.value = formatDateInput(defaultDate);

  // Set max date to today
  dobInput.max = formatDateInput(new Date());

  let countdownInterval = null;

  // ── Events ──
  btnCalc.addEventListener('click', runCalculation);
  dobInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runCalculation();
  });

  // Run on load
  runCalculation();

  // ════════════════════════════════════
  // MAIN CALCULATION
  // ════════════════════════════════════
  function runCalculation() {
    const dobValue = dobInput.value;
    if (!dobValue) {
      JoogadTools.showToast('Please select your Date of Birth', 'warning');
      return;
    }

    const dob = new Date(dobValue + 'T00:00:00');
    const now = new Date();

    if (dob > now) {
      JoogadTools.showToast('Date of birth cannot be in the future!', 'error');
      return;
    }

    // 1. Exact Age
    const age = calculateExactAge(dob, now);
    animateNumber('r-years', age.years);
    animateNumber('r-months', age.months);
    animateNumber('r-days', age.days);

    // 2. Day of Birth
    const dayName = dob.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dob.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('r-born-day').textContent = `You were born on a ${dayName} — ${formattedDate}`;

    // 3. Birthday Countdown
    startCountdown(dob);

    // 4. Zodiac Signs
    updateZodiac(dob);

    // 5. Age in Units
    updateAgeUnits(dob, now);

    // 6. Life Progress Chart
    drawLifeChart(age.years + age.months / 12);

    // 7. Life Stats
    updateLifeStats(dob, now);

    // Animate sections
    document.getElementById('result-panel').classList.add('result-animate');
    document.getElementById('units-section').classList.add('result-animate');
    document.getElementById('life-section').classList.add('result-animate');
  }

  // ════════════════════════════════════
  // 1. EXACT AGE CALCULATION
  // ════════════════════════════════════
  function calculateExactAge(dob, now) {
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      // Days in the previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  // ════════════════════════════════════
  // 2. BIRTHDAY COUNTDOWN
  // ════════════════════════════════════
  function startCountdown(dob) {
    if (countdownInterval) clearInterval(countdownInterval);

    function updateCountdown() {
      const now = new Date();
      let nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());

      // If birthday already passed this year, use next year
      if (nextBirthday <= now) {
        nextBirthday.setFullYear(now.getFullYear() + 1);
      }

      const diff = nextBirthday - now;
      const totalSeconds = Math.floor(diff / 1000);
      const d = Math.floor(totalSeconds / 86400);
      const h = Math.floor((totalSeconds % 86400) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      document.getElementById('cd-days').textContent = d;
      document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
      document.getElementById('cd-min').textContent = String(m).padStart(2, '0');
      document.getElementById('cd-sec').textContent = String(s).padStart(2, '0');
    }

    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }

  // ════════════════════════════════════
  // 3. ZODIAC SIGNS
  // ════════════════════════════════════
  function updateZodiac(dob) {
    const western = getWesternZodiac(dob);
    const chinese = getChineseZodiac(dob);

    document.getElementById('z-west-emoji').textContent = western.emoji;
    document.getElementById('z-west-name').textContent = western.sign;
    document.getElementById('z-china-emoji').textContent = chinese.emoji;
    document.getElementById('z-china-name').textContent = chinese.animal;
  }

  function getWesternZodiac(dob) {
    const month = dob.getMonth() + 1; // 1-12
    const day = dob.getDate();
    const signs = [
      { sign: 'Capricorn', emoji: '♑', start: [1, 1], end: [1, 19] },
      { sign: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
      { sign: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
      { sign: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
      { sign: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
      { sign: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
      { sign: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
      { sign: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
      { sign: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
      { sign: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
      { sign: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
      { sign: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
      { sign: 'Capricorn', emoji: '♑', start: [12, 22], end: [12, 31] }
    ];

    for (const z of signs) {
      const [sm, sd] = z.start;
      const [em, ed] = z.end;
      if ((month === sm && day >= sd) || (month === em && day <= ed)) {
        return z;
      }
    }
    return signs[0]; // fallback Capricorn
  }

  function getChineseZodiac(dob) {
    const animals = [
      { animal: 'Rat', emoji: '🐀' },
      { animal: 'Ox', emoji: '🐂' },
      { animal: 'Tiger', emoji: '🐅' },
      { animal: 'Rabbit', emoji: '🐇' },
      { animal: 'Dragon', emoji: '🐉' },
      { animal: 'Snake', emoji: '🐍' },
      { animal: 'Horse', emoji: '🐴' },
      { animal: 'Goat', emoji: '🐐' },
      { animal: 'Monkey', emoji: '🐒' },
      { animal: 'Rooster', emoji: '🐓' },
      { animal: 'Dog', emoji: '🐕' },
      { animal: 'Pig', emoji: '🐖' }
    ];
    // Chinese zodiac repeats every 12 years, 2000 was Dragon (index 4)
    const index = (dob.getFullYear() - 2000 + 4 + 1200) % 12; // +1200 to handle negative
    return animals[index];
  }

  // ════════════════════════════════════
  // 4. AGE IN DIFFERENT UNITS
  // ════════════════════════════════════
  function updateAgeUnits(dob, now) {
    const diffMs = now - dob;
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = calcTotalMonths(dob, now);

    document.getElementById('u-months').textContent = fmt(totalMonths);
    document.getElementById('u-weeks').textContent = fmt(totalWeeks);
    document.getElementById('u-days').textContent = fmt(totalDays);
    document.getElementById('u-hours').textContent = fmt(totalHours);
    document.getElementById('u-minutes').textContent = fmt(totalMinutes);
    document.getElementById('u-seconds').textContent = fmt(totalSeconds);
  }

  function calcTotalMonths(dob, now) {
    return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth()) + (now.getDate() >= dob.getDate() ? 0 : -1);
  }

  // ════════════════════════════════════
  // 5. LIFE PROGRESS DONUT CHART
  // ════════════════════════════════════
  function drawLifeChart(ageYears) {
    const canvas = document.getElementById('life-chart');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // High-DPI canvas
    const displayW = 260;
    const displayH = 260;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    ctx.scale(dpr, dpr);

    const W = displayW, H = displayH;
    ctx.clearRect(0, 0, W, H);

    const avgLifespan = 75;
    const percent = Math.min((ageYears / avgLifespan) * 100, 100);
    const livedAngle = (percent / 100) * 2 * Math.PI;
    const cx = W / 2, cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 15;
    const innerR = outerR * 0.65;

    // Background ring (remaining)
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI, true);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();

    // Lived arc — gradient
    if (livedAngle > 0) {
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, '#6C63FF');
      gradient.addColorStop(1, '#4ECDC4');

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, -Math.PI / 2, -Math.PI / 2 + livedAngle);
      ctx.arc(cx, cy, innerR, -Math.PI / 2 + livedAngle, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Glow effect
      ctx.shadowColor = 'rgba(108, 99, 255, 0.4)';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Center text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E8E8FF';
    ctx.font = `bold 28px 'JetBrains Mono', monospace`;
    ctx.fillText(percent.toFixed(1) + '%', cx, cy - 8);
    ctx.fillStyle = '#6B6B8D';
    ctx.font = `500 11px 'Inter', sans-serif`;
    ctx.fillText('of life lived', cx, cy + 16);

    // Update label
    document.getElementById('life-percent').textContent = percent.toFixed(1) + '% of ~75 years';
  }

  // ════════════════════════════════════
  // 6. FUN LIFE STATISTICS
  // ════════════════════════════════════
  function updateLifeStats(dob, now) {
    const diffMs = now - dob;
    const totalMinutes = diffMs / 60000;
    const totalHours = totalMinutes / 60;
    const totalDays = totalHours / 24;

    const heartbeats = Math.floor(totalMinutes * 72);       // ~72 bpm avg
    const breaths = Math.floor(totalMinutes * 15);           // ~15 per min
    const blinks = Math.floor(totalHours * 1200);            // ~1200 per hour (waking)
    const sleepHours = Math.floor(totalDays * 8);            // ~8 hrs/day
    const meals = Math.floor(totalDays * 3);                 // 3 meals/day
    const steps = Math.floor(totalDays * 7500);              // ~7500 steps/day

    document.getElementById('ls-heartbeats').textContent = fmtCompact(heartbeats);
    document.getElementById('ls-breaths').textContent = fmtCompact(breaths);
    document.getElementById('ls-blinks').textContent = fmtCompact(blinks);
    document.getElementById('ls-sleep').textContent = fmt(sleepHours);
    document.getElementById('ls-meals').textContent = fmt(meals);
    document.getElementById('ls-steps').textContent = fmtCompact(steps);
  }

  // ════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════
  function fmt(n) {
    return Math.floor(n).toLocaleString('en-IN');
  }

  function fmtCompact(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString('en-IN');
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Animated number counter
  function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    const duration = 800;
    const startTime = performance.now();
    const startVal = parseInt(el.textContent) || 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }
});
