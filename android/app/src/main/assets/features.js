// ============================================================
// Features.js — Дополнительные функции для Мотивация App
// ============================================================

// ===================== FEATURE 1: WEIGHT CHART (Canvas) =====================

function renderWeightChart(containerId) {
  var canvas = document.getElementById(containerId);
  if (!canvas) return;
  if (!state.weightHistory || state.weightHistory.length < 2) {
    var parent = canvas.parentElement;
    if (parent) {
      parent.innerHTML = '<p style="color:var(--text2);font-size:13px;text-align:center;padding:20px;">Недостаточно данных для графика. Записывайте вес ежедневно.</p>';
    }
    return;
  }

  var entries = state.weightHistory.slice(-30);
  var ctx = canvas.getContext('2d');

  // Responsive width
  var parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 340;
  canvas.width = parentWidth;
  canvas.height = 220;
  var W = canvas.width;
  var H = canvas.height;

  var padL = 50, padR = 16, padT = 24, padB = 40;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;

  // Data
  var weights = entries.map(function(e) { return e.weight; });
  var dates = entries.map(function(e) { return e.date; });
  var minW = Math.floor(Math.min.apply(null, weights) - 1);
  var maxW = Math.ceil(Math.max.apply(null, weights) + 1);
  var goalW = state.profile.goal || 0;

  if (goalW > 0 && goalW < minW) minW = Math.floor(goalW - 1);
  if (goalW > maxW) maxW = Math.ceil(goalW + 1);
  if (maxW === minW) maxW = minW + 2;

  var rangeW = maxW - minW;

  function xPos(i) { return padL + (i / (entries.length - 1)) * chartW; }
  function yPos(w) { return padT + (1 - (w - minW) / rangeW) * chartH; }

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#2d2d44';
  ctx.lineWidth = 0.5;
  var gridSteps = 5;
  for (var gi = 0; gi <= gridSteps; gi++) {
    var gw = minW + (rangeW / gridSteps) * gi;
    var gy = yPos(gw);
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(W - padR, gy);
    ctx.stroke();
    ctx.fillStyle = '#b2b2cc';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(gw.toFixed(1), padL - 6, gy + 3);
  }

  // Goal line (dashed)
  if (goalW > 0) {
    ctx.save();
    ctx.strokeStyle = '#00b894';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    var goalY = yPos(goalW);
    ctx.beginPath();
    ctx.moveTo(padL, goalY);
    ctx.lineTo(W - padR, goalY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00b894';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Цель: ' + goalW + ' кг', padL + 4, goalY - 6);
    ctx.restore();
  }

  // Line gradient
  var gradient = ctx.createLinearGradient(0, padT, 0, H - padB);
  gradient.addColorStop(0, '#6c5ce7');
  gradient.addColorStop(1, '#a29bfe');

  // Draw line
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (var i = 0; i < entries.length; i++) {
    var x = xPos(i);
    var y = yPos(weights[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Fill area under line
  ctx.save();
  ctx.beginPath();
  for (var i2 = 0; i2 < entries.length; i2++) {
    var x2 = xPos(i2);
    var y2 = yPos(weights[i2]);
    if (i2 === 0) ctx.moveTo(x2, y2);
    else ctx.lineTo(x2, y2);
  }
  ctx.lineTo(xPos(entries.length - 1), H - padB);
  ctx.lineTo(padL, H - padB);
  ctx.closePath();
  var fillGrad = ctx.createLinearGradient(0, padT, 0, H - padB);
  fillGrad.addColorStop(0, 'rgba(108,92,231,0.3)');
  fillGrad.addColorStop(1, 'rgba(108,92,231,0.02)');
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.restore();

  // Points
  for (var pi = 0; pi < entries.length; pi++) {
    var px = xPos(pi);
    var py = yPos(weights[pi]);
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#6c5ce7';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // X axis labels (show max ~6 dates)
  ctx.fillStyle = '#b2b2cc';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  var labelStep = Math.max(1, Math.floor(entries.length / 6));
  for (var li = 0; li < entries.length; li += labelStep) {
    var lx = xPos(li);
    var parts = dates[li].split('-');
    var monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    var label = parseInt(parts[2]) + ' ' + monthNames[parseInt(parts[1]) - 1];
    ctx.fillText(label, lx, H - padB + 16);
  }
  // Always show last date
  if (entries.length > 1 && (entries.length - 1) % labelStep !== 0) {
    var lastX = xPos(entries.length - 1);
    var lastParts = dates[entries.length - 1].split('-');
    var lastLabel = parseInt(lastParts[2]) + ' ' + monthNames[parseInt(lastParts[1]) - 1];
    ctx.fillText(lastLabel, lastX, H - padB + 16);
  }

  // Tooltip on click/touch
  canvas.onclick = function(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var closestIdx = 0;
    var closestDist = Infinity;
    for (var ci = 0; ci < entries.length; ci++) {
      var dist = Math.abs(mx - xPos(ci));
      if (dist < closestDist) { closestDist = dist; closestIdx = ci; }
    }
    if (closestDist < 30) {
      // Redraw and show tooltip
      renderWeightChart(containerId);
      var ttx = xPos(closestIdx);
      var tty = yPos(weights[closestIdx]);
      var ttCtx = document.getElementById(containerId).getContext('2d');
      ttCtx.fillStyle = 'rgba(20,20,31,0.95)';
      var ttW2 = 100, ttH2 = 36;
      var ttXPos = Math.max(padL, Math.min(ttx - ttW2/2, W - padR - ttW2));
      ttCtx.beginPath();
      ttCtx.roundRect(ttXPos, tty - ttH2 - 10, ttW2, ttH2, 6);
      ttCtx.fill();
      ttCtx.fillStyle = '#fff';
      ttCtx.font = 'bold 12px -apple-system, sans-serif';
      ttCtx.textAlign = 'center';
      ttCtx.fillText(weights[closestIdx] + ' кг', ttXPos + ttW2/2, tty - ttH2 + 6);
      ttCtx.fillStyle = '#b2b2cc';
      ttCtx.font = '10px -apple-system, sans-serif';
      ttCtx.fillText(formatDate(dates[closestIdx]), ttXPos + ttW2/2, tty - ttH2 + 22);
    }
  };
}

// Helper: generate weight chart HTML for embedding
function getWeightChartHTML() {
  return '<div class="dash-card"><h3>График веса</h3>' +
    '<canvas id="weightChartCanvas" style="width:100%;display:block;"></canvas></div>';
}


// ===================== FEATURE 2: STREAK SYSTEM =====================

function updateStreak() {
  var t = today();
  if (state.lastVisitDate === t) return;
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.getFullYear() + '-' +
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterday.getDate()).padStart(2, '0');
  if (state.lastVisitDate === yesterdayStr) {
    state.currentStreak = (state.currentStreak || 0) + 1;
  } else if (state.lastVisitDate !== t) {
    state.currentStreak = 1;
  }
  state.bestStreak = Math.max(state.bestStreak || 0, state.currentStreak);
  state.lastVisitDate = t;
  saveState();
}

function renderStreakBadge() {
  var streak = state.currentStreak || 0;
  var best = state.bestStreak || 0;
  if (streak <= 0) return '';
  var fireSize = streak >= 30 ? '32px' : streak >= 7 ? '28px' : '24px';
  var label = '';
  if (streak === 1) label = streak + ' день';
  else if (streak >= 2 && streak <= 4) label = streak + ' дня подряд!';
  else label = streak + ' дней подряд!';

  var html = '<div class="streak-badge" style="' +
    'display:inline-flex;align-items:center;gap:8px;' +
    'background:linear-gradient(135deg,#2d1b69,#1a1a3e);' +
    'padding:10px 16px;border-radius:14px;border:1px solid #6c5ce744;' +
    'margin-bottom:12px;width:100%;justify-content:space-between;">';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<span style="font-size:' + fireSize + '">🔥</span>';
  html += '<div><div style="font-size:15px;font-weight:700;color:#fdcb6e">' + label + '</div>';
  html += '<div style="font-size:11px;color:#b2b2cc">Рекорд: ' + best + ' дн.</div></div>';
  html += '</div>';
  if (streak >= 7) {
    html += '<span style="font-size:20px">🏆</span>';
  }
  html += '</div>';
  return html;
}


// ===================== FEATURE 3: DAILY QUOTE POPUP =====================

var FEATURE_QUOTES = [
  {text:'Сегодня — это подарок. Поэтому он называется «настоящее».', author:'Бил Кин'},
  {text:'Начни оттуда, где ты есть. Используй то, что имеешь. Делай то, что можешь.', author:'Артур Эш'},
  {text:'Единственный человек, которого ты должен стараться быть лучше — это тот, кем ты был вчера.', author:'Аноним'},
  {text:'Маленькие шаги каждый день приводят к большим результатам.', author:'Аноним'},
  {text:'Ты сильнее, чем думаешь, и храбрее, чем считаешь.', author:'А.А. Милн'},
  {text:'Не жди идеального момента. Возьми момент и сделай его идеальным.', author:'Аноним'},
  {text:'Путь в тысячу миль начинается с одного шага.', author:'Лао-цзы'},
  {text:'Дисциплина — это выбор между тем, что ты хочешь сейчас, и тем, чего хочешь больше всего.', author:'Авраам Линкольн'},
  {text:'Твоё тело достигает того, во что верит твой разум.', author:'Аноним'},
  {text:'Успех — это сумма маленьких усилий, повторяемых день за днём.', author:'Роберт Кольер'},
  {text:'Не сдавайся. Страдай сейчас и живи остаток жизни как чемпион.', author:'Мухаммед Али'},
  {text:'Каждый день — это новая возможность изменить свою жизнь.', author:'Аноним'},
  {text:'Забота о своём теле — это не роскошь, а необходимость.', author:'Аноним'},
  {text:'Ты не можешь изменить начало, но можешь начать менять конец.', author:'К.С. Льюис'},
  {text:'Сила не в том, чтобы никогда не падать, а в том, чтобы подниматься каждый раз.', author:'Конфуций'},
  {text:'Прогресс, а не совершенство.', author:'Аноним'},
  {text:'Лучшая тренировка — та, которую ты сделал.', author:'Аноним'},
  {text:'Изменения начинаются за пределами зоны комфорта.', author:'Аноним'},
  {text:'Верь в себя и всё, чем ты являешься. Знай, что внутри тебя есть нечто большее, чем любое препятствие.', author:'Кристиан Ларсон'},
  {text:'Одна тренировка не изменит тело. Но одно решение может изменить мышление.', author:'Аноним'}
];

function showDailyQuote() {
  var t = today();
  if (state.lastQuoteDate === t) return;

  // Pick a quote based on day so it's consistent within the day
  var dayHash = 0;
  for (var dh = 0; dh < t.length; dh++) {
    dayHash = ((dayHash << 5) - dayHash) + t.charCodeAt(dh);
    dayHash = dayHash & dayHash;
  }
  var qIdx = Math.abs(dayHash) % FEATURE_QUOTES.length;
  var q = FEATURE_QUOTES[qIdx];

  // Also try QUOTES_DATA from motivation_data.js if available
  if (typeof QUOTES_DATA !== 'undefined' && QUOTES_DATA.length > 0) {
    var qFromMain = QUOTES_DATA[Math.abs(dayHash) % QUOTES_DATA.length];
    if (qFromMain) {
      q = {text: qFromMain.text, author: qFromMain.author};
    }
  }

  var overlay = document.createElement('div');
  overlay.id = 'dailyQuoteOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;' +
    'display:flex;align-items:center;justify-content:center;padding:20px;' +
    'animation:fadeInQuote 0.3s ease;';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:linear-gradient(135deg,#1a1a3e,#14141f);' +
    'border-radius:20px;padding:32px 24px;max-width:360px;width:100%;text-align:center;' +
    'border:1px solid #6c5ce744;box-shadow:0 20px 60px rgba(0,0,0,0.5);' +
    'animation:scaleInQuote 0.3s ease;';

  modal.innerHTML =
    '<div style="font-size:48px;margin-bottom:16px;">💫</div>' +
    '<div style="font-size:14px;color:#b2b2cc;margin-bottom:16px;">Мысль на сегодня</div>' +
    '<div style="font-size:18px;line-height:1.6;font-style:italic;color:#fff;margin-bottom:16px;">' +
      '«' + q.text + '»</div>' +
    '<div style="font-size:13px;color:#a29bfe;margin-bottom:24px;">— ' + q.author + '</div>' +
    '<button onclick="closeDailyQuote()" style="padding:12px 40px;background:#6c5ce7;' +
      'color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;">' +
      'Вперёд! 💪</button>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Inject animation styles if not present
  if (!document.getElementById('quoteAnimStyles')) {
    var style = document.createElement('style');
    style.id = 'quoteAnimStyles';
    style.textContent =
      '@keyframes fadeInQuote{from{opacity:0}to{opacity:1}}' +
      '@keyframes scaleInQuote{from{transform:scale(0.8);opacity:0}to{transform:scale(1);opacity:1}}' +
      '@keyframes fadeOutQuote{from{opacity:1}to{opacity:0}}';
    document.head.appendChild(style);
  }

  state.lastQuoteDate = t;
  saveState();
}

function closeDailyQuote() {
  var overlay = document.getElementById('dailyQuoteOverlay');
  if (overlay) {
    overlay.style.animation = 'fadeOutQuote 0.2s ease forwards';
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);
  }
}


// ===================== FEATURE 4: THEME TOGGLE (Dark/Light) =====================

var currentTheme = localStorage.getItem('appTheme') || 'dark';

var THEME_DARK = {
  '--bg': '#0a0a0f',
  '--card': '#14141f',
  '--card2': '#1a1a2e',
  '--card-bg': '#14141f',
  '--accent': '#6c5ce7',
  '--accent2': '#a29bfe',
  '--green': '#00b894',
  '--orange': '#fdcb6e',
  '--red': '#e17055',
  '--blue': '#0984e3',
  '--text': '#ffffff',
  '--text2': '#b2b2cc',
  '--text-secondary': '#b2b2cc',
  '--text-muted': '#6b6b8a',
  '--border': '#2d2d44'
};

var THEME_LIGHT = {
  '--bg': '#f5f6fa',
  '--card': '#ffffff',
  '--card2': '#f0f0f5',
  '--card-bg': '#ffffff',
  '--accent': '#6c5ce7',
  '--accent2': '#5a4bd1',
  '--green': '#00a884',
  '--orange': '#e6a817',
  '--red': '#d63031',
  '--blue': '#0770c9',
  '--text': '#1a1a2e',
  '--text2': '#555577',
  '--text-secondary': '#555577',
  '--text-muted': '#8888aa',
  '--border': '#d8d8e8'
};

function applyTheme() {
  var vars = currentTheme === 'dark' ? THEME_DARK : THEME_LIGHT;
  var root = document.documentElement;
  for (var key in vars) {
    if (vars.hasOwnProperty(key)) {
      root.style.setProperty(key, vars[key]);
    }
  }
  // Update body background explicitly for smooth transition
  document.body.style.background = vars['--bg'];
  document.body.style.color = vars['--text'];

  // Update toggle button icon if present
  var toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    toggleBtn.title = currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme();
  localStorage.setItem('appTheme', currentTheme);
}

function renderThemeToggle() {
  return '<button id="themeToggleBtn" onclick="toggleTheme()" style="' +
    'position:fixed;top:16px;right:16px;z-index:200;width:44px;height:44px;' +
    'border-radius:50%;border:1px solid var(--border);background:var(--card);' +
    'font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:transform 0.2s;"' +
    ' title="' + (currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема') + '">' +
    (currentTheme === 'dark' ? '☀️' : '🌙') + '</button>';
}

// Apply theme on load
(function() {
  applyTheme();
})();


// ===================== FEATURE 5: ACTIVITY CALENDAR =====================

var calendarMonth = new Date().getMonth();
var calendarYear = new Date().getFullYear();

function renderActivityCalendar(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  var t = today();

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  html += '<button onclick="calendarPrev(\'' + containerId + '\')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;">←</button>';
  html += '<div style="font-size:16px;font-weight:600;">' + monthNames[calendarMonth] + ' ' + calendarYear + '</div>';
  html += '<button onclick="calendarNext(\'' + containerId + '\')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;">→</button>';
  html += '</div>';

  // Day headers
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;">';
  for (var dh = 0; dh < 7; dh++) {
    html += '<div style="text-align:center;font-size:11px;color:var(--text2);padding:4px 0;">' + dayNames[dh] + '</div>';
  }
  html += '</div>';

  // Calculate first day
  var firstDay = new Date(calendarYear, calendarMonth, 1);
  var startWeekDay = firstDay.getDay();
  // Convert from Sun=0 to Mon=0 system
  startWeekDay = startWeekDay === 0 ? 6 : startWeekDay - 1;
  var daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';

  // Empty cells before first day
  for (var ei = 0; ei < startWeekDay; ei++) {
    html += '<div style="aspect-ratio:1;"></div>';
  }

  // Day cells
  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = calendarYear + '-' + String(calendarMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var isToday = dateStr === t;

    var hasExercise = state.exerciseLog && state.exerciseLog[dateStr] && state.exerciseLog[dateStr].length > 0;
    var hasFood = state.foodLog && state.foodLog[dateStr] && state.foodLog[dateStr].length > 0;
    var waterAmount = state.waterLog && state.waterLog[dateStr] ? state.waterLog[dateStr] : 0;
    var waterGoalMet = waterAmount >= (state.profile.weight ? state.profile.weight * 35 : 2000);
    var hasWeight = false;
    if (state.weightHistory) {
      for (var wi = 0; wi < state.weightHistory.length; wi++) {
        if (state.weightHistory[wi].date === dateStr) { hasWeight = true; break; }
      }
    }

    var hasActivity = hasExercise || hasFood || waterGoalMet || hasWeight;
    var bgColor = isToday ? 'rgba(108,92,231,0.3)' : hasActivity ? 'rgba(0,184,148,0.15)' : 'var(--card2)';
    var borderStyle = isToday ? 'border:2px solid #6c5ce7;' : 'border:1px solid var(--border);';

    html += '<div style="aspect-ratio:1;border-radius:8px;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;background:' + bgColor + ';' + borderStyle +
      'position:relative;min-height:40px;">';
    html += '<div style="font-size:12px;font-weight:' + (isToday ? '700' : '400') + ';color:' + (isToday ? '#6c5ce7' : 'var(--text)') + ';">' + day + '</div>';

    // Activity icons (small)
    if (hasActivity) {
      var icons = '';
      if (hasExercise) icons += '🏋️';
      if (hasFood) icons += '🍽';
      if (waterGoalMet) icons += '💧';
      if (hasWeight) icons += '⚖️';
      html += '<div style="font-size:7px;line-height:1;margin-top:1px;">' + icons + '</div>';
    }
    html += '</div>';
  }

  html += '</div>';

  // Legend
  html += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;font-size:11px;color:var(--text2);">';
  html += '<span>🏋️ Тренировка</span>';
  html += '<span>🍽 Питание</span>';
  html += '<span>💧 Вода (норма)</span>';
  html += '<span>⚖️ Вес</span>';
  html += '</div>';

  container.innerHTML = html;
}

function calendarPrev(containerId) {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderActivityCalendar(containerId);
}

function calendarNext(containerId) {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderActivityCalendar(containerId);
}

function getActivityCalendarHTML() {
  return '<div class="dash-card"><h3>Календарь активности</h3>' +
    '<div id="activityCalendar"></div></div>';
}


// ===================== FEATURE 6: OPENFOODFACTS BARCODE SCANNER =====================

var barcodeStream = null;
var barcodeDetectorInstance = null;

async function scanBarcode() {
  // Create scanner overlay
  var overlay = document.createElement('div');
  overlay.id = 'barcodeOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:500;' +
    'display:flex;flex-direction:column;align-items:center;';

  overlay.innerHTML =
    '<div style="padding:16px;width:100%;display:flex;justify-content:space-between;align-items:center;">' +
      '<button onclick="closeBarcodeScanner()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">✕</button>' +
      '<span style="color:#fff;font-size:16px;font-weight:600;">Сканер штрих-кода</span>' +
      '<div style="width:24px;"></div>' +
    '</div>' +
    '<div style="flex:1;width:100%;max-width:400px;position:relative;overflow:hidden;border-radius:12px;margin:0 16px;">' +
      '<video id="barcodeVideo" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">' +
        '<div style="width:250px;height:100px;border:2px solid #6c5ce7;border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,0.4);"></div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:16px;color:#b2b2cc;font-size:13px;text-align:center;">Наведите камеру на штрих-код продукта</div>' +
    '<div style="padding:0 16px 16px;width:100%;max-width:400px;">' +
      '<div style="display:flex;gap:8px;">' +
        '<input type="text" id="manualBarcodeInput" placeholder="Или введите код вручную..." ' +
          'style="flex:1;padding:12px;background:#1a1a2e;border:1px solid #2d2d44;border-radius:10px;color:#fff;font-size:14px;">' +
        '<button onclick="manualBarcodeLookup()" style="padding:12px 20px;background:#6c5ce7;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Найти</button>' +
      '</div>' +
    '</div>' +
    '<div id="barcodeResult" style="padding:0 16px 20px;width:100%;max-width:400px;"></div>';

  document.body.appendChild(overlay);

  // Try to access camera
  try {
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    var video = document.getElementById('barcodeVideo');
    if (video) {
      video.srcObject = barcodeStream;
    }

    // Try BarcodeDetector API
    if ('BarcodeDetector' in window) {
      barcodeDetectorInstance = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39']
      });
      detectBarcode(video);
    }
  } catch (err) {
    var videoEl = document.getElementById('barcodeVideo');
    if (videoEl) {
      videoEl.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;' +
        'height:200px;color:#b2b2cc;text-align:center;padding:20px;">' +
        '<div>📷 Камера недоступна<br><span style="font-size:12px;">Введите штрих-код вручную</span></div></div>';
    }
  }
}

async function detectBarcode(video) {
  if (!barcodeDetectorInstance || !barcodeStream) return;
  try {
    var barcodes = await barcodeDetectorInstance.detect(video);
    if (barcodes.length > 0) {
      var code = barcodes[0].rawValue;
      if (code) {
        showBarcodeLoading();
        var product = await lookupBarcode(code);
        showBarcodeResult(product, code);
        return;
      }
    }
  } catch (e) { /* continue scanning */ }
  if (barcodeStream) {
    requestAnimationFrame(function() { detectBarcode(video); });
  }
}

function showBarcodeLoading() {
  var resultDiv = document.getElementById('barcodeResult');
  if (resultDiv) {
    resultDiv.innerHTML = '<div style="text-align:center;padding:16px;color:#b2b2cc;">⏳ Поиск продукта...</div>';
  }
}

async function lookupBarcode(code) {
  try {
    var resp = await fetch('https://world.openfoodfacts.org/api/v0/product/' + code + '.json');
    var data = await resp.json();
    if (data.status === 1) {
      var p = data.product;
      return {
        name: p.product_name || p.product_name_ru || p.product_name_en || 'Неизвестный продукт',
        kcal: Math.round(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0),
        p: Math.round(p.nutriments.proteins_100g || 0),
        f: Math.round(p.nutriments.fat_100g || 0),
        c: Math.round(p.nutriments.carbohydrates_100g || 0),
        per: 100,
        brand: p.brands || '',
        image: p.image_small_url || ''
      };
    }
  } catch (e) { }
  return null;
}

function showBarcodeResult(product, code) {
  var resultDiv = document.getElementById('barcodeResult');
  if (!resultDiv) return;

  if (!product) {
    resultDiv.innerHTML = '<div style="background:#1a1a2e;border-radius:12px;padding:16px;text-align:center;">' +
      '<div style="font-size:32px;margin-bottom:8px;">🤷</div>' +
      '<div style="color:#fff;font-size:14px;">Продукт не найден</div>' +
      '<div style="color:#b2b2cc;font-size:12px;margin-top:4px;">Код: ' + code + '</div></div>';
    return;
  }

  var html = '<div style="background:#1a1a2e;border-radius:12px;padding:16px;border:1px solid #2d2d44;">';
  if (product.image) {
    html += '<div style="display:flex;gap:12px;margin-bottom:12px;">';
    html += '<img src="' + product.image + '" style="width:60px;height:60px;object-fit:contain;border-radius:8px;background:#fff;">';
    html += '<div><div style="font-size:15px;font-weight:600;color:#fff;">' + product.name + '</div>';
    if (product.brand) html += '<div style="font-size:12px;color:#b2b2cc;">' + product.brand + '</div>';
    html += '</div></div>';
  } else {
    html += '<div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:8px;">' + product.name + '</div>';
    if (product.brand) html += '<div style="font-size:12px;color:#b2b2cc;margin-bottom:8px;">' + product.brand + '</div>';
  }

  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">';
  html += '<div style="text-align:center;background:#14141f;padding:8px;border-radius:8px;"><div style="font-size:16px;font-weight:700;color:#fdcb6e;">' + product.kcal + '</div><div style="font-size:10px;color:#b2b2cc;">ккал</div></div>';
  html += '<div style="text-align:center;background:#14141f;padding:8px;border-radius:8px;"><div style="font-size:16px;font-weight:700;color:#e17055;">' + product.p + '</div><div style="font-size:10px;color:#b2b2cc;">белки</div></div>';
  html += '<div style="text-align:center;background:#14141f;padding:8px;border-radius:8px;"><div style="font-size:16px;font-weight:700;color:#fdcb6e;">' + product.f + '</div><div style="font-size:10px;color:#b2b2cc;">жиры</div></div>';
  html += '<div style="text-align:center;background:#14141f;padding:8px;border-radius:8px;"><div style="font-size:16px;font-weight:700;color:#0984e3;">' + product.c + '</div><div style="font-size:10px;color:#b2b2cc;">углев.</div></div>';
  html += '</div>';
  html += '<div style="font-size:11px;color:#b2b2cc;margin-bottom:12px;text-align:center;">На 100 г продукта</div>';

  // Weight input and add button
  html += '<div style="display:flex;gap:8px;">';
  html += '<input type="number" id="barcodeGrams" value="100" min="1" max="5000" placeholder="Граммы" ' +
    'style="flex:1;padding:10px;background:#14141f;border:1px solid #2d2d44;border-radius:8px;color:#fff;font-size:14px;">';
  html += '<button onclick="addBarcodeFood()" style="padding:10px 20px;background:#00b894;color:#fff;' +
    'border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Добавить</button>';
  html += '</div>';
  html += '</div>';

  // Store product data globally for adding
  window._barcodeProduct = product;
  resultDiv.innerHTML = html;
}

async function manualBarcodeLookup() {
  var input = document.getElementById('manualBarcodeInput');
  if (!input || !input.value.trim()) return;
  showBarcodeLoading();
  var product = await lookupBarcode(input.value.trim());
  showBarcodeResult(product, input.value.trim());
}

function addBarcodeFood() {
  var product = window._barcodeProduct;
  if (!product) return;
  var grams = parseFloat(document.getElementById('barcodeGrams').value) || 100;
  var ratio = grams / 100;

  var entry = {
    name: product.name + (grams !== 100 ? ' (' + grams + ' г)' : ''),
    kcal: Math.round(product.kcal * ratio),
    p: Math.round(product.p * ratio),
    f: Math.round(product.f * ratio),
    c: Math.round(product.c * ratio),
    grams: grams,
    time: new Date().toTimeString().slice(0, 5)
  };

  var t = today();
  if (!state.foodLog[t]) state.foodLog[t] = [];
  state.foodLog[t].push(entry);
  saveState();

  closeBarcodeScanner();

  // Refresh weight tabs if visible
  if (typeof renderWeightTabs === 'function') renderWeightTabs();
}

function closeBarcodeScanner() {
  if (barcodeStream) {
    barcodeStream.getTracks().forEach(function(track) { track.stop(); });
    barcodeStream = null;
  }
  barcodeDetectorInstance = null;
  var overlay = document.getElementById('barcodeOverlay');
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function getScanButtonHTML() {
  return '<button onclick="scanBarcode()" style="' +
    'display:inline-flex;align-items:center;gap:6px;padding:10px 16px;' +
    'background:var(--card2);border:1px solid var(--border);border-radius:10px;' +
    'color:var(--text);font-size:13px;cursor:pointer;margin-bottom:12px;">' +
    '📷 Сканировать</button>';
}


// ===================== FEATURE 7: BUSINESS IDEAS COMPARISON =====================

var bizCompareSort = 'name';
var bizCompareSortDir = 1; // 1 = asc, -1 = desc

function renderBizComparison() {
  if (typeof bizSaved === 'undefined' || !bizSaved || bizSaved.length === 0) {
    return '<div class="empty-msg" style="text-align:center;padding:40px 20px;color:var(--text2);">' +
      '<div style="font-size:48px;margin-bottom:16px;">📊</div>' +
      '<h3 style="color:var(--text);margin-bottom:8px;">Нет сохранённых идей</h3>' +
      '<p style="font-size:13px;">Сохраните идеи в генераторе, чтобы сравнить их здесь</p></div>';
  }

  var ideas = bizSaved.slice(0, 5);

  // Sort
  ideas.sort(function(a, b) {
    var va, vb;
    if (bizCompareSort === 'name') { va = a.name || ''; vb = b.name || ''; }
    else if (bizCompareSort === 'revenue') {
      va = (a.estimatedRevenue && a.estimatedRevenue.max) || (a.revenue || 0);
      vb = (b.estimatedRevenue && b.estimatedRevenue.max) || (b.revenue || 0);
    }
    else if (bizCompareSort === 'difficulty') { va = a.difficulty || 0; vb = b.difficulty || 0; }
    else if (bizCompareSort === 'demand') { va = a.demand || 0; vb = b.demand || 0; }
    else { va = 0; vb = 0; }

    if (typeof va === 'string') return bizCompareSortDir * va.localeCompare(vb);
    return bizCompareSortDir * (va - vb);
  });

  var html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -16px;padding:0 16px;">';
  html += '<table style="width:100%;min-width:580px;border-collapse:collapse;font-size:13px;">';

  // Header
  var cols = [
    {key:'name', label:'Название'},
    {key:'revenue', label:'Доход'},
    {key:'difficulty', label:'Сложность'},
    {key:'demand', label:'Спрос'},
    {key:'competition', label:'Конкуренция'}
  ];

  html += '<tr>';
  cols.forEach(function(col) {
    var arrow = bizCompareSort === col.key ? (bizCompareSortDir === 1 ? ' ↑' : ' ↓') : '';
    html += '<th onclick="sortBizComparison(\'' + col.key + '\')" style="' +
      'padding:10px 8px;text-align:left;border-bottom:2px solid var(--border);' +
      'color:var(--accent2);font-size:12px;cursor:pointer;white-space:nowrap;' +
      'user-select:none;">' + col.label + arrow + '</th>';
  });
  html += '</tr>';

  // Rows
  ideas.forEach(function(idea) {
    html += '<tr style="border-bottom:1px solid var(--border);">';

    // Name
    html += '<td style="padding:10px 8px;font-weight:600;max-width:160px;">' +
      (idea.name || 'Без названия').substring(0, 40) + '</td>';

    // Revenue
    var rev = '';
    if (idea.estimatedRevenue) {
      rev = '$' + (idea.estimatedRevenue.min || 0).toLocaleString() + ' — $' + (idea.estimatedRevenue.max || 0).toLocaleString();
    } else if (idea.revenue) {
      rev = '$' + idea.revenue.toLocaleString();
    } else {
      rev = '—';
    }
    html += '<td style="padding:10px 8px;color:var(--green);font-size:12px;white-space:nowrap;">' + rev + '</td>';

    // Difficulty (stars)
    var diff = idea.difficulty || 0;
    var stars = '';
    for (var s = 0; s < 5; s++) {
      stars += s < diff ? '★' : '☆';
    }
    var diffColor = diff <= 2 ? 'var(--green)' : diff <= 3 ? 'var(--orange)' : 'var(--red)';
    html += '<td style="padding:10px 8px;color:' + diffColor + ';font-size:12px;">' + stars + '</td>';

    // Demand (bars)
    var dem = idea.demand || 0;
    var bars = '';
    for (var b = 0; b < 5; b++) {
      bars += '<span style="display:inline-block;width:6px;height:' + (8 + b * 3) + 'px;' +
        'background:' + (b < dem ? 'var(--accent)' : 'var(--border)') + ';' +
        'border-radius:2px;margin-right:2px;vertical-align:bottom;"></span>';
    }
    html += '<td style="padding:10px 8px;">' + bars + '</td>';

    // Competition
    var compLabels = {low:'Низкая', medium:'Средняя', high:'Высокая'};
    var compColors = {low:'var(--green)', medium:'var(--orange)', high:'var(--red)'};
    var comp = idea.competition || 'medium';
    html += '<td style="padding:10px 8px;">' +
      '<span style="padding:3px 8px;border-radius:6px;font-size:11px;' +
      'background:' + (compColors[comp] || 'var(--text2)') + '22;' +
      'color:' + (compColors[comp] || 'var(--text2)') + ';">' +
      (compLabels[comp] || comp) + '</span></td>';

    html += '</tr>';
  });

  html += '</table></div>';

  if (bizSaved.length > 5) {
    html += '<div style="text-align:center;color:var(--text2);font-size:12px;margin-top:12px;">Показаны 5 из ' + bizSaved.length + ' идей</div>';
  }

  return html;
}

function sortBizComparison(key) {
  if (bizCompareSort === key) {
    bizCompareSortDir *= -1;
  } else {
    bizCompareSort = key;
    bizCompareSortDir = 1;
  }
  // Re-render business section
  if (typeof renderBusiness === 'function') renderBusiness();
}


// ===================== FEATURE 8: DESKTOP SIDEBAR =====================

var sidebarInitialized = false;

function initDesktop() {
  if (window.innerWidth < 768) {
    // Remove sidebar if window resized smaller
    if (sidebarInitialized) {
      var existingSidebar = document.querySelector('.features-sidebar');
      if (existingSidebar) existingSidebar.remove();
      document.body.classList.remove('has-sidebar');
      sidebarInitialized = false;
    }
    return;
  }
  if (sidebarInitialized) return;

  // Inject sidebar styles
  if (!document.getElementById('sidebarStyles')) {
    var style = document.createElement('style');
    style.id = 'sidebarStyles';
    style.textContent =
      '.features-sidebar{position:fixed;left:0;top:0;width:240px;height:100vh;' +
        'background:var(--card);border-right:1px solid var(--border);' +
        'display:flex;flex-direction:column;z-index:300;padding:0;overflow-y:auto;}' +
      '.features-sidebar .sidebar-logo{padding:24px 20px;font-size:22px;font-weight:700;' +
        'border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;}' +
      '.features-sidebar .sidebar-nav{flex:1;padding:12px 0;}' +
      '.features-sidebar .sidebar-nav-item{display:flex;align-items:center;gap:12px;' +
        'padding:12px 20px;font-size:14px;color:var(--text2);cursor:pointer;' +
        'transition:all 0.2s;text-decoration:none;border:none;background:none;width:100%;}' +
      '.features-sidebar .sidebar-nav-item:hover{background:var(--card2);color:var(--text);}' +
      '.features-sidebar .sidebar-nav-item.active{color:var(--accent2);background:rgba(108,92,231,0.1);' +
        'border-right:3px solid var(--accent);}' +
      '.features-sidebar .sidebar-footer{padding:16px 20px;border-top:1px solid var(--border);' +
        'font-size:12px;color:var(--text2);}' +
      'body.has-sidebar .screen{margin-left:240px;}' +
      'body.has-sidebar .section-header{left:240px;}' +
      'body.has-sidebar .bottom-nav{display:none !important;}' +
      '@media(max-width:767px){.features-sidebar{display:none !important;}' +
        'body.has-sidebar .screen{margin-left:0;}' +
        'body.has-sidebar .section-header{left:0;}}';
    document.head.appendChild(style);
  }

  var sidebar = document.createElement('div');
  sidebar.className = 'features-sidebar';

  var streak = state.currentStreak || 0;
  var streakText = streak > 0 ? '🔥 ' + streak + ' дн.' : '';

  sidebar.innerHTML =
    '<div class="sidebar-logo">💪 Мотивация</div>' +
    '<nav class="sidebar-nav">' +
      '<button class="sidebar-nav-item" onclick="showMenu()">' +
        '<span>🏠</span><span>Главная</span></button>' +
      '<button class="sidebar-nav-item" onclick="openMotivation()">' +
        '<span>🧠</span><span>Мотивация</span></button>' +
      '<button class="sidebar-nav-item" onclick="openWeight()">' +
        '<span>⚖️</span><span>Контроль веса</span></button>' +
      (typeof openBusiness === 'function' ?
        '<button class="sidebar-nav-item" onclick="openBusiness()">' +
        '<span>💡</span><span>Бизнес идеи</span></button>' : '') +
      '<div style="border-top:1px solid var(--border);margin:8px 20px;"></div>' +
      '<button class="sidebar-nav-item" onclick="toggleTheme()">' +
        '<span id="sidebarThemeIcon">' + (currentTheme === 'dark' ? '☀️' : '🌙') + '</span>' +
        '<span>' + (currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема') + '</span></button>' +
    '</nav>' +
    '<div class="sidebar-footer">' +
      (streakText ? '<div style="margin-bottom:8px;">' + streakText + '</div>' : '') +
      '<div>Вес: ' + (getCurrentWeight ? getCurrentWeight() : state.profile.weight) + ' кг</div>' +
      '<div style="margin-top:4px;">Цель: ' + (state.profile.goal || '—') + ' кг</div>' +
    '</div>';

  document.body.prepend(sidebar);
  document.body.classList.add('has-sidebar');
  sidebarInitialized = true;
}

// Update sidebar on theme change
var _origToggleTheme = toggleTheme;
toggleTheme = function() {
  _origToggleTheme();
  var icon = document.getElementById('sidebarThemeIcon');
  if (icon) icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
};

// Listen for resize
window.addEventListener('resize', function() {
  clearTimeout(window._sidebarResizeTimer);
  window._sidebarResizeTimer = setTimeout(initDesktop, 200);
});


// ===================== INITIALIZATION =====================

// Hook into the app initialization
(function() {
  // Wait for DOM and the main app to initialize
  var origInitApp = window.initApp;
  if (typeof origInitApp === 'function') {
    window.initApp = function() {
      origInitApp();
      initFeatures();
    };
  } else {
    // If initApp is not defined yet, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initFeatures, 100);
    });
  }
})();

function initFeatures() {
  // Update streak
  updateStreak();

  // Show daily quote
  setTimeout(function() { showDailyQuote(); }, 500);

  // Apply saved theme
  applyTheme();

  // Init desktop sidebar
  initDesktop();

  // Hook into dashboard rendering to add chart and calendar
  hookDashboard();
}

function hookDashboard() {
  // Override renderDashboard if it exists to add weight chart and calendar
  var origRenderDashboard = window.renderDashboard;
  if (typeof origRenderDashboard === 'function') {
    window.renderDashboard = function(container) {
      origRenderDashboard(container);

      // Add streak badge at the top
      var streakHtml = renderStreakBadge();
      if (streakHtml) {
        container.innerHTML = streakHtml + container.innerHTML;
      }

      // Add weight chart after existing content
      var chartDiv = document.createElement('div');
      chartDiv.className = 'dash-card';
      chartDiv.innerHTML = '<h3>График веса</h3><canvas id="weightChartCanvas" style="width:100%;display:block;"></canvas>';
      // Insert before dash-actions
      var actions = container.querySelector('.dash-actions');
      if (actions) {
        container.insertBefore(chartDiv, actions);
      } else {
        container.appendChild(chartDiv);
      }

      // Render the chart
      setTimeout(function() { renderWeightChart('weightChartCanvas'); }, 50);

      // Add activity calendar
      var calDiv = document.createElement('div');
      calDiv.className = 'dash-card';
      calDiv.innerHTML = '<h3>Календарь активности</h3><div id="activityCalendar"></div>';
      if (actions) {
        container.insertBefore(calDiv, actions);
      } else {
        container.appendChild(calDiv);
      }
      setTimeout(function() { renderActivityCalendar('activityCalendar'); }, 50);
    };
  }

  // Hook into renderBusiness to add comparison tab
  var origRenderBusiness = window.renderBusiness;
  if (typeof origRenderBusiness === 'function') {
    window.renderBusiness = function() {
      origRenderBusiness();
      // Add comparison tab button
      var c = document.getElementById('businessContent');
      if (c) {
        var tabsDiv = c.querySelector('.biz-tabs');
        if (tabsDiv && !tabsDiv.querySelector('[data-tab="compare"]')) {
          var compareBtn = document.createElement('button');
          compareBtn.className = 'biz-tab' + (typeof bizTab !== 'undefined' && bizTab === 'compare' ? ' active' : '');
          compareBtn.setAttribute('data-tab', 'compare');
          compareBtn.textContent = 'Сравнение';
          compareBtn.onclick = function() {
            bizTab = 'compare';
            renderBusiness();
          };
          tabsDiv.appendChild(compareBtn);
        }
        // If compare tab is active, render comparison
        if (typeof bizTab !== 'undefined' && bizTab === 'compare') {
          // Remove everything after tabs
          var nodes = c.children;
          for (var ni = nodes.length - 1; ni >= 0; ni--) {
            if (!nodes[ni].classList.contains('biz-tabs')) {
              c.removeChild(nodes[ni]);
            }
          }
          var compDiv = document.createElement('div');
          compDiv.style.padding = '16px 0';
          compDiv.innerHTML = renderBizComparison();
          c.appendChild(compDiv);
        }
      }
    };
  }

  // Hook into food tab to add barcode scan button
  var origRenderFoodTab = window.renderFoodTab;
  if (typeof origRenderFoodTab === 'function') {
    window.renderFoodTab = function(container) {
      origRenderFoodTab(container);
      // Add scan button at the top of the food tab
      var scanBtn = document.createElement('div');
      scanBtn.innerHTML = getScanButtonHTML();
      container.insertBefore(scanBtn, container.firstChild);
    };
  }
}
