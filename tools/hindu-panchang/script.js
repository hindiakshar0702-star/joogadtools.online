/// <reference path="../../js/common.d.ts" />
// ============================================
// Hindu Panchang / Tithi Calculator — Script
// Astronomical calculations (approximate)
// Based on Jean Meeus's "Astronomical Algorithms"
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  JoogadTools.renderHeader('tools/hindu-panchang');
  JoogadTools.renderFooter('tools/hindu-panchang');

  const dateInput = document.getElementById('panchang-date');
  const btnCalc = document.getElementById('btn-panchang');

  // Set today
  const today = new Date();
  dateInput.value = formatDateStr(today);
  dateInput.max = '2100-12-31';

  // Events
  btnCalc.addEventListener('click', calculate);
  dateInput.addEventListener('change', calculate);

  // Quick date buttons
  document.getElementById('q-today').addEventListener('click', () => setQuickDate(0));
  document.getElementById('q-yesterday').addEventListener('click', () => setQuickDate(-1));
  document.getElementById('q-tomorrow').addEventListener('click', () => setQuickDate(1));

  function setQuickDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    dateInput.value = formatDateStr(d);
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    if (offset === 0) document.getElementById('q-today').classList.add('active');
    else if (offset === -1) document.getElementById('q-yesterday').classList.add('active');
    else document.getElementById('q-tomorrow').classList.add('active');
    calculate();
  }

  // Run on load
  calculate();

  // ════════════════════════════════════════════
  // MAIN CALCULATION
  // ════════════════════════════════════════════
  function calculate() {
    const dateVal = dateInput.value;
    if (!dateVal) return;

    const date = new Date(dateVal + 'T12:00:00'); // Noon for better accuracy
    const jd = toJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());

    // Core calculations
    const sunLong = getSunLongitude(jd);
    const moonLong = getMoonLongitude(jd);

    const tithi = getTithi(moonLong, sunLong);
    const nakshatra = getNakshatra(moonLong);
    const paksha = getPaksha(tithi.index);
    const yoga = getYoga(sunLong, moonLong);
    const karana = getKarana(tithi.index);
    const hinduMonth = getHinduMonth(sunLong);
    const varDay = getVar(date);
    const rahuKaal = getRahuKaal(date.getDay());
    const sunTimes = getApproxSunTimes(date);
    const auspicious = getAuspiciousness(tithi.index);

    // Update DOM
    document.getElementById('p-tithi').textContent = tithi.name;
    document.getElementById('p-nakshatra').textContent = nakshatra.name;
    document.getElementById('p-paksha').textContent = paksha.name;
    document.getElementById('p-month').textContent = hinduMonth;
    document.getElementById('p-yoga').textContent = yoga.name;
    document.getElementById('p-karana').textContent = karana;
    document.getElementById('p-var').textContent = varDay;
    document.getElementById('p-rahu').textContent = rahuKaal;
    document.getElementById('p-sunrise').textContent = sunTimes.sunrise;
    document.getElementById('p-sunset').textContent = sunTimes.sunset;

    // Moon phase
    document.getElementById('moon-phase-name').textContent = tithi.name.split('(')[0].trim();
    document.getElementById('moon-paksha-label').textContent = paksha.name;
    drawMoonPhase(tithi.index);

    // Auspicious
    const card = document.getElementById('auspicious-card');
    card.className = 'glass-card--static panchang-auspicious mt-xl ' + auspicious.type;
    document.getElementById('ausp-icon').textContent = auspicious.type === 'shubh' ? '🟢' : '🔴';
    document.getElementById('ausp-title').textContent = auspicious.type === 'shubh' ? '✨ शुभ दिन' : '⚠️ सावधानी का दिन';
    document.getElementById('ausp-desc').textContent = auspicious.message;
  }

  // ════════════════════════════════════════════
  // ASTRONOMICAL ALGORITHMS
  // ════════════════════════════════════════════

  function toJulianDay(year, month, day) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  function getSunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const L0 = normalize(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M = normalize(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
    const Mrad = M * Math.PI / 180;
    const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad)
            + 0.019993 * Math.sin(2 * Mrad)
            + 0.000289 * Math.sin(3 * Mrad);
    return normalize(L0 + C);
  }

  function getMoonLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const Lp = 218.3165 + 481267.8813 * T;
    const D = 297.8502 + 445267.1115 * T;
    const M = 357.5291 + 35999.0503 * T;
    const Mp = 134.9634 + 477198.8676 * T;
    const F = 93.2720 + 483202.0175 * T;

    const toRad = (deg) => deg * Math.PI / 180;

    let moonLong = Lp
      + 6.289 * Math.sin(toRad(Mp))
      + 1.274 * Math.sin(toRad(2 * D - Mp))
      + 0.658 * Math.sin(toRad(2 * D))
      + 0.214 * Math.sin(toRad(2 * Mp))
      - 0.186 * Math.sin(toRad(M))
      - 0.114 * Math.sin(toRad(2 * F))
      + 0.059 * Math.sin(toRad(2 * D - 2 * Mp))
      + 0.057 * Math.sin(toRad(2 * D - M - Mp))
      - 0.053 * Math.sin(toRad(2 * D + Mp));

    return normalize(moonLong);
  }

  function normalize(deg) {
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
  }

  // ════════════════════════════════════════════
  // PANCHANG ELEMENTS
  // ════════════════════════════════════════════

  function getTithi(moonLong, sunLong) {
    let diff = moonLong - sunLong;
    if (diff < 0) diff += 360;
    const index = Math.floor(diff / 12); // 0–29

    const names = [
      'प्रतिपदा (Pratipada)', 'द्वितीया (Dwitiya)', 'तृतीया (Tritiya)',
      'चतुर्थी (Chaturthi)', 'पंचमी (Panchami)', 'षष्ठी (Shashthi)',
      'सप्तमी (Saptami)', 'अष्टमी (Ashtami)', 'नवमी (Navami)',
      'दशमी (Dashami)', 'एकादशी (Ekadashi)', 'द्वादशी (Dwadashi)',
      'त्रयोदशी (Trayodashi)', 'चतुर्दशी (Chaturdashi)', 'पूर्णिमा (Purnima)',
      'प्रतिपदा (Pratipada)', 'द्वितीया (Dwitiya)', 'तृतीया (Tritiya)',
      'चतुर्थी (Chaturthi)', 'पंचमी (Panchami)', 'षष्ठी (Shashthi)',
      'सप्तमी (Saptami)', 'अष्टमी (Ashtami)', 'नवमी (Navami)',
      'दशमी (Dashami)', 'एकादशी (Ekadashi)', 'द्वादशी (Dwadashi)',
      'त्रयोदशी (Trayodashi)', 'चतुर्दशी (Chaturdashi)', 'अमावस्या (Amavasya)'
    ];

    return { index, name: names[index] || '—' };
  }

  function getPaksha(tithiIndex) {
    if (tithiIndex < 15) {
      return { name: 'शुक्ल पक्ष (Shukla Paksha)', type: 'shukla' };
    }
    return { name: 'कृष्ण पक्ष (Krishna Paksha)', type: 'krishna' };
  }

  function getNakshatra(moonLong) {
    const index = Math.floor(moonLong / (360 / 27));
    const names = [
      'अश्विनी (Ashwini)', 'भरणी (Bharani)', 'कृत्तिका (Krittika)',
      'रोहिणी (Rohini)', 'मृगशिरा (Mrigashira)', 'आर्द्रा (Ardra)',
      'पुनर्वसु (Punarvasu)', 'पुष्य (Pushya)', 'आश्लेषा (Ashlesha)',
      'मघा (Magha)', 'पूर्वा फाल्गुनी (P. Phalguni)', 'उत्तरा फाल्गुनी (U. Phalguni)',
      'हस्त (Hasta)', 'चित्रा (Chitra)', 'स्वाति (Swati)',
      'विशाखा (Vishakha)', 'अनुराधा (Anuradha)', 'ज्येष्ठा (Jyeshtha)',
      'मूल (Mula)', 'पूर्वाषाढ़ा (P. Ashadha)', 'उत्तराषाढ़ा (U. Ashadha)',
      'श्रवण (Shravana)', 'धनिष्ठा (Dhanishtha)', 'शतभिषा (Shatabhisha)',
      'पूर्वा भाद्रपद (P. Bhadrapada)', 'उत्तरा भाद्रपद (U. Bhadrapada)', 'रेवती (Revati)'
    ];
    return { index, name: names[index] || '—' };
  }

  function getYoga(sunLong, moonLong) {
    let sum = sunLong + moonLong;
    if (sum >= 360) sum -= 360;
    const index = Math.floor(sum / (360 / 27));
    const names = [
      'विष्कम्भ (Vishkambha)', 'प्रीति (Preeti)', 'आयुष्मान (Ayushman)',
      'सौभाग्य (Saubhagya)', 'शोभन (Shobhana)', 'अतिगण्ड (Atiganda)',
      'सुकर्मा (Sukarma)', 'धृति (Dhriti)', 'शूल (Shoola)',
      'गण्ड (Ganda)', 'वृद्धि (Vriddhi)', 'ध्रुव (Dhruva)',
      'व्याघात (Vyaghata)', 'हर्षण (Harshana)', 'वज्र (Vajra)',
      'सिद्धि (Siddhi)', 'व्यतीपात (Vyatipata)', 'वरीयान (Variyana)',
      'परिघ (Parigha)', 'शिव (Shiva)', 'सिद्ध (Siddha)',
      'साध्य (Sadhya)', 'शुभ (Shubha)', 'शुक्ल (Shukla)',
      'ब्रह्म (Brahma)', 'इन्द्र (Indra)', 'वैधृति (Vaidhriti)'
    ];
    return { index, name: names[index] || '—' };
  }

  function getKarana(tithiIndex) {
    const fixedKaranas = ['किंस्तुघ्न (Kimstughna)', 'शकुनि (Shakuni)', 'चतुष्पाद (Chatushpada)', 'नाग (Naga)'];
    const cyclingKaranas = [
      'बव (Bava)', 'बालव (Balava)', 'कौलव (Kaulava)', 'तैतिल (Taitila)',
      'गर (Gara)', 'वणिज (Vanija)', 'विष्टि (Vishti)'
    ];

    const karanaNum = tithiIndex * 2;
    if (karanaNum === 0) return fixedKaranas[0];
    if (karanaNum >= 57) return fixedKaranas[karanaNum - 56] || fixedKaranas[3];
    return cyclingKaranas[(karanaNum - 1) % 7];
  }

  function getHinduMonth(sunLong) {
    const index = Math.floor(sunLong / 30);
    const months = [
      'मेष — चैत्र (Chaitra)', 'वृषभ — वैशाख (Vaishakha)', 'मिथुन — ज्येष्ठ (Jyeshtha)',
      'कर्क — आषाढ़ (Ashadha)', 'सिंह — श्रावण (Shravana)', 'कन्या — भाद्रपद (Bhadrapada)',
      'तुला — आश्विन (Ashwin)', 'वृश्चिक — कार्तिक (Kartika)', 'धनु — मार्गशीर्ष (Margashirsha)',
      'मकर — पौष (Pausha)', 'कुम्भ — माघ (Magha)', 'मीन — फाल्गुन (Phalguna)'
    ];
    return months[index] || '—';
  }

  function getVar(date) {
    const vars = [
      'रविवार (Sunday)', 'सोमवार (Monday)', 'मंगलवार (Tuesday)',
      'बुधवार (Wednesday)', 'गुरुवार (Thursday)', 'शुक्रवार (Friday)', 'शनिवार (Saturday)'
    ];
    return vars[date.getDay()];
  }

  function getRahuKaal(dayOfWeek) {
    const timings = [
      '4:30 PM – 6:00 PM',   // Sunday
      '7:30 AM – 9:00 AM',   // Monday
      '3:00 PM – 4:30 PM',   // Tuesday
      '12:00 PM – 1:30 PM',  // Wednesday
      '1:30 PM – 3:00 PM',   // Thursday
      '10:30 AM – 12:00 PM', // Friday
      '9:00 AM – 10:30 AM'   // Saturday
    ];
    return timings[dayOfWeek];
  }

  function getApproxSunTimes(date) {
    const dayOfYear = getDayOfYear(date);
    const variation = 0.75;
    const offset = Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);
    const sunrise = 6.0 - offset * variation;
    const sunset = 18.0 + offset * variation;
    return { sunrise: formatHour(sunrise), sunset: formatHour(sunset) };
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / 86400000);
  }

  function formatHour(h) {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours > 12 ? hours - 12 : hours;
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  // ════════════════════════════════════════════
  // AUSPICIOUSNESS
  // ════════════════════════════════════════════
  function getAuspiciousness(tithiIndex) {
    const pakshaIndex = tithiIndex % 15;
    // Special: Purnima / Amavasya
    if (pakshaIndex === 14) {
      if (tithiIndex < 15) {
        return { type: 'shubh', message: 'पूर्णिमा — अत्यंत शुभ दिन। पूजा, दान, व्रत के लिए उत्तम। Purnima is considered very auspicious for prayers and charity.' };
      }
      return { type: 'ashubh', message: 'अमावस्या — पितृ तर्पण के लिए उत्तम, परन्तु नए कार्य आरंभ करने से बचें। Amavasya is good for ancestor rituals.' };
    }

    const shubhIndices = [0, 1, 2, 4, 6, 9, 10, 11, 12]; // Pratipada, Dwitiya, Tritiya, Panchami, Saptami, Dashami, Ekadashi, Dwadashi, Trayodashi
    if (shubhIndices.includes(pakshaIndex)) {
      return { type: 'shubh', message: 'शुभ दिन — पूजा, यात्रा, नए कार्य आरंभ, विवाह एवं शुभ कार्यों के लिए उत्तम। Auspicious for new beginnings.' };
    }
    return { type: 'ashubh', message: 'इस दिन नए कार्य, यात्रा या बड़े निर्णय से बचने की सलाह दी जाती है। Avoid starting new ventures on this day.' };
  }

  // ════════════════════════════════════════════
  // MOON PHASE DRAWING
  // ════════════════════════════════════════════
  function drawMoonPhase(tithiIndex) {
    const canvas = document.getElementById('moon-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 200;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);

    // Moon illumination: 0 = new moon, 15 = full moon
    // tithiIndex 0-14: Shukla (waxing), 15-29: Krishna (waning)
    let illumination;
    if (tithiIndex <= 14) {
      illumination = tithiIndex / 14; // 0 to 1 (new to full)
    } else {
      illumination = (29 - tithiIndex) / 14; // 1 to 0 (full to new)
    }

    // Dark base (moon shadow)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();

    // Subtle crater texture
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw lit portion
    if (illumination > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.clip();

      // Phase geometry
      const phase = illumination * 2; // 0 to 2
      const isWaxing = tithiIndex <= 14;

      ctx.beginPath();
      // Lit ellipse
      if (phase <= 1) {
        // Less than half lit
        const bulge = r * (1 - phase * 2); // r to -r
        if (isWaxing) {
          // Right side lit
          ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
          ctx.ellipse(cx, cy, Math.abs(bulge), r, 0, Math.PI / 2, -Math.PI / 2, phase < 0.5);
        } else {
          // Left side lit
          ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
          ctx.ellipse(cx, cy, Math.abs(bulge), r, 0, -Math.PI / 2, Math.PI / 2, phase < 0.5);
        }
      } else {
        // More than half lit
        const bulge = r * ((phase - 1) * 2); // -r to r
        if (isWaxing) {
          ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
          ctx.ellipse(cx, cy, Math.abs(bulge), r, 0, Math.PI / 2, -Math.PI / 2, true);
        } else {
          ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
          ctx.ellipse(cx, cy, Math.abs(bulge), r, 0, -Math.PI / 2, Math.PI / 2, true);
        }
      }
      ctx.closePath();

      // Moon surface gradient
      const grad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
      grad.addColorStop(0, '#FFFDE7');
      grad.addColorStop(0.5, '#FFF9C4');
      grad.addColorStop(1, '#E0C67A');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
    }

    // Full moon or near-full: add glow
    if (illumination > 0.8) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(255, 220, 100, ${0.2 * illumination})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════
  function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
});
