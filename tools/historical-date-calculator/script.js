/// <reference path="../../js/common.d.ts" />
// ============================================
// Historical Date Calculator — Script
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/historical-date-calculator');
  JoogadTools.renderFooter('tools/historical-date-calculator');
  JoogadTools.initTabs('.tabs');

  // ── Set defaults ──
  const today = new Date();
  const todayStr = formatDateInput(today);
  const dayInput = document.getElementById('day-date-input');
  const addInput = document.getElementById('add-start-date');
  if (dayInput) dayInput.value = todayStr;
  if (addInput) addInput.value = todayStr;

  // ═══════════════════════════════════════════
  // ERA TOGGLE LOGIC (reusable)
  // ═══════════════════════════════════════════
  document.querySelectorAll('.era-toggle').forEach(toggle => {
    toggle.querySelectorAll('.era-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // ═══════════════════════════════════════════
  // TAB 1: DATE DIFFERENCE
  // ═══════════════════════════════════════════
  document.getElementById('btn-diff').addEventListener('click', calcDifference);

  function calcDifference() {
    const dayA = parseInt(document.getElementById('diff-a-day').value) || 1;
    const monthA = parseInt(document.getElementById('diff-a-month').value) || 1;
    const yearA = parseInt(document.getElementById('diff-a-year').value) || 1;
    const eraA = document.querySelector('#diff-a-bce.active, #diff-a-ce.active')?.dataset.era || 'bce';

    const dayB = parseInt(document.getElementById('diff-b-day').value) || 1;
    const monthB = parseInt(document.getElementById('diff-b-month').value) || 1;
    const yearB = parseInt(document.getElementById('diff-b-year').value) || 1;
    const eraB = document.querySelector('#diff-b-bce.active, #diff-b-ce.active')?.dataset.era || 'ce';

    // Convert to astronomical year (BCE 1 = 0, BCE 2 = -1, etc.)
    const astroYearA = eraA === 'bce' ? -(yearA - 1) : yearA;
    const astroYearB = eraB === 'bce' ? -(yearB - 1) : yearB;

    // Calculate approximate total days using Julian Day Number
    const jdA = toJulianDay(astroYearA, monthA, dayA);
    const jdB = toJulianDay(astroYearB, monthB, dayB);
    const totalDays = Math.abs(Math.round(jdB - jdA));

    // Calculate years, months, days
    const result = calcYMD(astroYearA, monthA, dayA, astroYearB, monthB, dayB);

    document.getElementById('diff-r-years').textContent = fmt(Math.abs(result.years));
    document.getElementById('diff-r-months').textContent = Math.abs(result.months);
    document.getElementById('diff-r-days').textContent = Math.abs(result.days);
    document.getElementById('diff-r-total').textContent = fmt(totalDays);

    // Fun fact
    const generations = Math.floor(totalDays / (365.25 * 25));
    const labelA = `${yearA} ${eraA.toUpperCase()}`;
    const labelB = `${yearB} ${eraB.toUpperCase()}`;
    document.getElementById('diff-fun-fact').querySelector('.fact-text').textContent =
      `From ${labelA} to ${labelB} — that's approximately ${fmt(generations)} generations!`;
  }

  function calcYMD(y1, m1, d1, y2, m2, d2) {
    // Ensure date1 < date2
    const jd1 = toJulianDay(y1, m1, d1);
    const jd2 = toJulianDay(y2, m2, d2);
    let startY, startM, startD, endY, endM, endD;
    if (jd1 <= jd2) {
      [startY, startM, startD] = [y1, m1, d1];
      [endY, endM, endD] = [y2, m2, d2];
    } else {
      [startY, startM, startD] = [y2, m2, d2];
      [endY, endM, endD] = [y1, m1, d1];
    }

    let years = endY - startY;
    let months = endM - startM;
    let days = endD - startD;

    if (days < 0) {
      months--;
      days += 30; // approximate
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  }

  // ═══════════════════════════════════════════
  // TAB 2: DAY FINDER
  // ═══════════════════════════════════════════
  document.getElementById('btn-day').addEventListener('click', findDay);

  function findDay() {
    let year, month, day;
    const dateVal = document.getElementById('day-date-input').value;
    const manDay = document.getElementById('day-m-day').value;
    const manMonth = document.getElementById('day-m-month').value;
    const manYear = document.getElementById('day-m-year').value;

    if (manDay && manMonth && manYear) {
      day = parseInt(manDay);
      month = parseInt(manMonth);
      year = parseInt(manYear);
    } else if (dateVal) {
      const d = new Date(dateVal + 'T00:00:00');
      day = d.getDate();
      month = d.getMonth() + 1;
      year = d.getFullYear();
    } else {
      JoogadTools.showToast('Please enter a date', 'warning');
      return;
    }

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      JoogadTools.showToast('Invalid date entered', 'error');
      return;
    }

    // Day of week using Tomohiko Sakamoto's algorithm
    const dayName = getDayOfWeek(year, month, day);
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('day-r-name').textContent = dayName;
    document.getElementById('day-r-full').textContent = `${monthNames[month]} ${day}, ${year} CE`;

    // Week number (ISO)
    const dateObj = new Date(year, month - 1, day);
    const weekNum = getISOWeek(dateObj);
    const dayOfYear = getDayOfYear(dateObj);
    const isLeap = isLeapYear(year);
    const totalDaysInYear = isLeap ? 366 : 365;
    const remaining = totalDaysInYear - dayOfYear;

    document.getElementById('day-r-week').textContent = weekNum;
    document.getElementById('day-r-dayofyear').textContent = dayOfYear + getSuffix(dayOfYear);
    document.getElementById('day-r-remaining').textContent = remaining;
  }

  // ═══════════════════════════════════════════
  // TAB 3: ADD / SUBTRACT
  // ═══════════════════════════════════════════
  document.getElementById('btn-add').addEventListener('click', calcAddSub);

  function calcAddSub() {
    const dateVal = document.getElementById('add-start-date').value;
    if (!dateVal) {
      JoogadTools.showToast('Please select a start date', 'warning');
      return;
    }

    const startDate = new Date(dateVal + 'T00:00:00');
    const amount = parseInt(document.getElementById('add-amount').value) || 0;
    const unit = document.getElementById('add-unit').value;
    const isAdd = document.getElementById('op-add').classList.contains('active');
    const multiplier = isAdd ? 1 : -1;

    const result = new Date(startDate);
    switch (unit) {
      case 'days':
        result.setDate(result.getDate() + amount * multiplier);
        break;
      case 'weeks':
        result.setDate(result.getDate() + amount * 7 * multiplier);
        break;
      case 'months':
        result.setMonth(result.getMonth() + amount * multiplier);
        break;
      case 'years':
        result.setFullYear(result.getFullYear() + amount * multiplier);
        break;
    }

    const dayName = result.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = result.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('add-r-day').textContent = dayName;
    document.getElementById('add-r-full').textContent = fullDate;

    const op = isAdd ? '+' : '−';
    const startFmt = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('add-fun-fact').querySelector('.fact-text').textContent =
      `${startFmt} ${op} ${amount} ${unit} = ${fullDate} (${dayName})`;
  }

  // ═══════════════════════════════════════════
  // TAB 4: LEAP YEAR
  // ═══════════════════════════════════════════
  document.getElementById('btn-leap').addEventListener('click', checkLeap);

  function checkLeap() {
    const year = parseInt(document.getElementById('leap-year').value);
    if (!year || year < 1) {
      JoogadTools.showToast('Please enter a valid year', 'warning');
      return;
    }

    const leap = isLeapYear(year);
    const badge = document.getElementById('leap-badge');
    const yearText = document.getElementById('leap-year-text');
    const reason = document.getElementById('leap-reason');

    badge.textContent = leap ? '✅ YES' : '❌ NO';
    badge.className = 'leap-badge ' + (leap ? 'yes' : 'no');
    yearText.textContent = `${year} CE is ${leap ? '' : 'NOT '}a Leap Year`;

    // Explain why
    if (year % 400 === 0) {
      reason.textContent = `Divisible by 400 → Leap Year`;
    } else if (year % 100 === 0) {
      reason.textContent = `Divisible by 100 but NOT by 400 → NOT a Leap Year`;
    } else if (year % 4 === 0) {
      reason.textContent = `Divisible by 4 and NOT by 100 → Leap Year`;
    } else {
      reason.textContent = `NOT divisible by 4 → NOT a Leap Year`;
    }

    // Nearby leap years
    const nearby = [];
    for (let y = year - 12; y <= year + 12; y++) {
      if (y > 0 && isLeapYear(y)) {
        nearby.push(y);
      }
    }

    const container = document.getElementById('leap-nearby');
    container.innerHTML = nearby.map(y =>
      `<span class="leap-year-pill${y === year ? ' current' : ''}">${y}</span>`
    ).join('');

    // Fun fact
    const nextLeap = findNextLeap(year);
    document.getElementById('leap-fun').textContent =
      leap
        ? `🎉 ${year} has 366 days! Feb 29 exists this year. Next leap year: ${nextLeap}.`
        : `${year} has 365 days. The next leap year is ${nextLeap}.`;
  }

  function findNextLeap(fromYear) {
    let y = fromYear + 1;
    while (!isLeapYear(y)) y++;
    return y;
  }

  // ═══════════════════════════════════════════
  // TAB 5: FAMOUS EVENTS
  // ═══════════════════════════════════════════
  const EVENTS = [
    // Ancient India
    { year: 2500, era: 'BCE', title: 'Indus Valley Civilization', desc: 'Harappa & Mohenjo-daro — one of the world\'s earliest urban civilizations', category: 'ancient-india' },
    { year: 1500, era: 'BCE', title: 'Vedic Period Begins', desc: 'Composition of the Rigveda — oldest known scripture', category: 'ancient-india' },
    { year: 563, era: 'BCE', title: 'Birth of Gautama Buddha', desc: 'Founder of Buddhism, born in Lumbini (modern Nepal)', category: 'ancient-india' },
    { year: 540, era: 'BCE', title: 'Birth of Mahavira', desc: '24th Tirthankara, founder of Jainism', category: 'ancient-india' },
    { year: 322, era: 'BCE', title: 'Maurya Empire Founded', desc: 'Chandragupta Maurya establishes the Maurya dynasty', category: 'ancient-india' },
    { year: 269, era: 'BCE', title: 'Ashoka the Great', desc: 'Emperor Ashoka embraces Buddhism, spreads Dhamma', category: 'ancient-india' },
    { year: 320, era: 'CE', title: 'Gupta Empire (Golden Age)', desc: 'Art, science, mathematics & astronomy flourish in India', category: 'ancient-india' },

    // World History
    { year: 2560, era: 'BCE', title: 'Great Pyramid of Giza', desc: 'One of the Seven Wonders of the Ancient World', category: 'world' },
    { year: 776, era: 'BCE', title: 'First Olympic Games', desc: 'Ancient Olympics held in Olympia, Greece', category: 'world' },
    { year: 44, era: 'BCE', title: 'Julius Caesar Assassinated', desc: 'Roman leader killed on the Ides of March', category: 'world' },
    { year: 476, era: 'CE', title: 'Fall of Roman Empire', desc: 'Western Roman Empire collapses, marking end of ancient era', category: 'world' },
    { year: 1492, era: 'CE', title: 'Columbus Reaches Americas', desc: 'Christopher Columbus lands in the New World', category: 'world' },
    { year: 1789, era: 'CE', title: 'French Revolution', desc: 'Storming of the Bastille — birth of modern democracy', category: 'world' },
    { year: 1945, era: 'CE', title: 'World War II Ends', desc: 'Atomic bombs, UN founded, new world order begins', category: 'world' },

    // Modern India
    { year: 1526, era: 'CE', title: 'Mughal Empire Founded', desc: 'Babur defeats Ibrahim Lodi at the Battle of Panipat', category: 'modern-india' },
    { year: 1600, era: 'CE', title: 'East India Company', desc: 'British East India Company established to trade with India', category: 'modern-india' },
    { year: 1857, era: 'CE', title: 'Indian Rebellion of 1857', desc: 'First War of Independence — Sepoy Mutiny against British rule', category: 'modern-india' },
    { year: 1885, era: 'CE', title: 'Indian National Congress', desc: 'INC founded — beginning of organized freedom movement', category: 'modern-india' },
    { year: 1930, era: 'CE', title: 'Salt March (Dandi March)', desc: 'Mahatma Gandhi leads the iconic civil disobedience movement', category: 'modern-india' },
    { year: 1947, era: 'CE', title: 'Indian Independence', desc: 'India gains independence from British rule on August 15', category: 'modern-india' },
    { year: 1950, era: 'CE', title: 'Republic Day', desc: 'Constitution of India comes into effect on January 26', category: 'modern-india' },
    { year: 1969, era: 'CE', title: 'ISRO Founded', desc: 'Indian Space Research Organisation established under Vikram Sarabhai', category: 'modern-india' },

    // Science & Technology
    { year: 1440, era: 'CE', title: 'Printing Press Invented', desc: 'Gutenberg invents movable type — revolution in knowledge sharing', category: 'science' },
    { year: 1687, era: 'CE', title: 'Newton\'s Principia', desc: 'Isaac Newton publishes laws of motion & universal gravitation', category: 'science' },
    { year: 1879, era: 'CE', title: 'Electric Light Bulb', desc: 'Thomas Edison invents practical incandescent light bulb', category: 'science' },
    { year: 1903, era: 'CE', title: 'First Powered Flight', desc: 'Wright Brothers achieve the first airplane flight at Kitty Hawk', category: 'science' },
    { year: 1969, era: 'CE', title: 'Moon Landing', desc: 'Apollo 11 — Neil Armstrong walks on the Moon', category: 'science' },
    { year: 1991, era: 'CE', title: 'World Wide Web', desc: 'Tim Berners-Lee makes the web publicly available', category: 'science' },
    { year: 2023, era: 'CE', title: 'Chandrayaan-3 Landing', desc: 'India becomes 4th country to land on the Moon\'s south pole', category: 'science' },
  ];

  function renderEvents(filter = '', category = 'all') {
    const grid = document.getElementById('events-grid');
    const currentYear = new Date().getFullYear();
    const q = filter.toLowerCase();

    const filtered = EVENTS.filter(e => {
      const matchCat = category === 'all' || e.category === category;
      const matchSearch = !q || e.title.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    // Sort by chronological order (oldest first)
    filtered.sort((a, b) => {
      const yA = a.era === 'BCE' ? -a.year : a.year;
      const yB = b.era === 'BCE' ? -b.year : b.year;
      return yA - yB;
    });

    grid.innerHTML = filtered.map(e => {
      const yearsAgo = e.era === 'BCE' ? currentYear + e.year - 1 : currentYear - e.year;
      return `
        <div class="event-card" data-category="${e.category}">
          <div class="event-year">${e.year} ${e.era}</div>
          <div class="event-info">
            <div class="event-title">${e.title}</div>
            <div class="event-desc">${e.desc}</div>
          </div>
          <div class="event-ago">~${fmt(yearsAgo)} yrs ago</div>
        </div>
      `;
    }).join('');

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="hint-text" style="text-align:center;padding:2rem;">No events found.</div>';
    }
  }

  // Initial render
  renderEvents();

  // Filter events
  document.getElementById('events-filter').addEventListener('input', JoogadTools.debounce((e) => {
    const activeCat = document.querySelector('.cat-btn.active')?.dataset.cat || 'all';
    renderEvents(e.target.value, activeCat);
  }, 200));

  // Category buttons
  document.getElementById('cat-btns').addEventListener('click', (e) => {
    if (!e.target.classList.contains('cat-btn')) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const filterVal = document.getElementById('events-filter').value;
    renderEvents(filterVal, e.target.dataset.cat);
  });

  // ═══════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════

  // Julian Day Number (for any date including BCE)
  function toJulianDay(year, month, day) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  // Day of week using Tomohiko Sakamoto's algorithm
  function getDayOfWeek(year, month, day) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    let y = year;
    if (month < 3) y--;
    const idx = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
    return dayNames[idx];
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / 86400000);
  }

  function getSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function fmt(n) {
    return Math.abs(Math.floor(n)).toLocaleString('en-IN');
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Run default calculations
  calcDifference();
  checkLeap();
  findDay();
});
