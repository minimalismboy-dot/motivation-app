// ============================================================
// Motivation + Weight Loss App — Main Logic
// ============================================================

// --------------- STATE ---------------
var state = {
  introSeen: false,
  profile: {
    gender: '', age: 0, weight: 0, height: 0,
    goal: 0, date: '', activity: 1.55,
    jobType: 'office', lifestyle: 'moderate'
  },
  watchedVideos: [],
  savedVideos: [],
  foodLog: {},
  waterLog: {},
  weightHistory: [],
  selectedDiet: 0,
  completedChallenges: [],
  unlockedAchievements: [],
  exerciseLog: {},
  currentVideoCategory: 'all'
};

var exerciseTimer = null;
var exerciseStartTime = null;
var exerciseCurrentIdx = null;
var exerciseElapsed = 0;

// --------------- HELPERS ---------------

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function nowTime() {
  var d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  var parts = dateStr.split('-');
  var months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function daysLeft() {
  if (!state.profile.date) return 90;
  var target = new Date(state.profile.date);
  var now = new Date(today());
  var diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function calcActivityCoeff(jobType, lifestyle) {
  var base = { office: 1.2, remote: 1.2, mixed: 1.4, physical: 1.6 };
  var bonus = { sedentary: 0, light: 0.1, moderate: 0.2, active: 0.3, veryactive: 0.4 };
  var b = base[jobType] || 1.2;
  var bo = bonus[lifestyle] || 0.2;
  return Math.min(b + bo, 1.9);
}

function calcBMR(p) {
  // Mifflin-St Jeor
  if (!p || !p.weight || !p.height || !p.age) return 0;
  var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? bmr + 5 : bmr - 161;
}

function calcTDEE(p) {
  var coeff = p.activity || calcActivityCoeff(p.jobType, p.lifestyle);
  return calcBMR(p) * coeff;
}

function calcDeficit(p) {
  if (!p.goal || !p.weight) return 0;
  var kgToLose = p.weight - p.goal;
  if (kgToLose <= 0) return 0;
  var days = daysLeft();
  // 7700 kcal per kg of fat
  var totalDeficit = kgToLose * 7700;
  var dailyDeficit = totalDeficit / days;
  // Clamp max daily deficit to 1000 kcal for safety
  return Math.min(dailyDeficit, 1000);
}

function calcTargetCalories(p) {
  var tdee = calcTDEE(p);
  var deficit = calcDeficit(p);
  var target = tdee - deficit;
  var min = p.gender === 'female' ? 1200 : 1500;
  return Math.max(Math.round(target), min);
}

function calcBMI(weight, height) {
  if (!weight || !height) return 0;
  var h = height / 100;
  return weight / (h * h);
}

function bmiCategory(bmi) {
  if (bmi < 16) return { text: 'Выраженный дефицит', color: '#e74c3c' };
  if (bmi < 18.5) return { text: 'Недостаточный вес', color: '#f39c12' };
  if (bmi < 25) return { text: 'Норма', color: '#27ae60' };
  if (bmi < 30) return { text: 'Избыточный вес', color: '#f39c12' };
  if (bmi < 35) return { text: 'Ожирение I степени', color: '#e67e22' };
  if (bmi < 40) return { text: 'Ожирение II степени', color: '#e74c3c' };
  return { text: 'Ожирение III степени', color: '#c0392b' };
}

function calcMacros(kcal, dietIndex) {
  var diet = DIETS_DATA[dietIndex] || DIETS_DATA[0];
  var r = diet.ratio;
  return {
    protein: Math.round((kcal * r.p / 100) / 4),
    fat: Math.round((kcal * r.f / 100) / 9),
    carbs: Math.round((kcal * r.c / 100) / 4)
  };
}

function waterNorm() {
  return Math.round(state.profile.weight * 35);
}

function glassesNeeded() {
  return Math.ceil(waterNorm() / 250);
}

// --------------- PERSISTENCE ---------------

function saveState() {
  try {
    localStorage.setItem('motivApp2', JSON.stringify(state));
  } catch (e) { }
}

function loadState() {
  try {
    var saved = localStorage.getItem('motivApp2');
    if (saved) {
      var parsed = JSON.parse(saved);
      // Merge with defaults
      for (var key in parsed) {
        if (parsed.hasOwnProperty(key)) {
          if (key === 'profile') {
            for (var pk in parsed.profile) {
              if (parsed.profile.hasOwnProperty(pk)) {
                state.profile[pk] = parsed.profile[pk];
              }
            }
          } else {
            state[key] = parsed[key];
          }
        }
      }
    }
  } catch (e) { }
}

// --------------- SCREEN NAVIGATION ---------------

function switchScreen(id) {
  var screens = document.querySelectorAll('.screen');
  screens.forEach(function (s) { s.classList.remove('active'); });
  var target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function showMenu() {
  switchScreen('menuScreen');
}

function openMotivation() {
  switchScreen('motivationScreen');
  renderMotivationTabs();
}

function openWeight() {
  switchScreen('weightScreen');
  renderWeightTabs();
}

// --------------- INTRO ---------------

function showIntro() {
  switchScreen('introScreen');
  var container = document.getElementById('introVideo');
  if (container) {
    container.innerHTML = '<iframe width="100%" height="220" src="https://www.youtube.com/embed/ZXsQAXx_ao0?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
  }
  var btn = document.getElementById('introBtn');
  if (btn) btn.style.display = 'none';

  setTimeout(function () {
    if (btn) {
      btn.style.display = 'block';
      btn.textContent = 'Продолжить';
    }
  }, 20000);
}

function introContinue() {
  state.introSeen = true;
  saveState();
  if (!state.profile.gender) {
    showSetup(1);
  } else {
    showMenu();
  }
}

// --------------- SETUP WIZARD ---------------

var setupStep = 1;

function showSetup(step) {
  setupStep = step || 1;
  switchScreen('setupScreen');
  renderSetupStep();
}

function renderSetupStep() {
  var c = document.getElementById('setupContent');
  if (!c) return;
  var html = '<div class="setup-progress">Шаг ' + setupStep + ' из 4</div>';

  if (setupStep === 1) {
    html += '<h2>Пол и возраст</h2>';
    html += '<div class="setup-field"><label>Пол:</label><div class="gender-btns">';
    html += '<button class="btn ' + (state.profile.gender === 'male' ? 'btn-active' : '') + '" onclick="state.profile.gender=\'male\';renderSetupStep()">Мужской</button>';
    html += '<button class="btn ' + (state.profile.gender === 'female' ? 'btn-active' : '') + '" onclick="state.profile.gender=\'female\';renderSetupStep()">Женский</button>';
    html += '</div></div>';
    html += '<div class="setup-field"><label>Возраст:</label><input type="number" id="setupAge" value="' + (state.profile.age || '') + '" min="14" max="99" placeholder="Ваш возраст"></div>';
    html += '<button class="btn btn-primary" onclick="nextSetup()">Далее</button>';
  } else if (setupStep === 2) {
    html += '<h2>Вес и рост</h2>';
    html += '<div class="setup-field"><label>Текущий вес (кг):</label><input type="number" id="setupWeight" value="' + (state.profile.weight || '') + '" min="30" max="300" step="0.1" placeholder="Ваш вес"></div>';
    html += '<div class="setup-field"><label>Рост (см):</label><input type="number" id="setupHeight" value="' + (state.profile.height || '') + '" min="100" max="250" placeholder="Ваш рост"></div>';
    html += '<div class="setup-btns"><button class="btn" onclick="showSetup(1)">Назад</button><button class="btn btn-primary" onclick="nextSetup()">Далее</button></div>';
  } else if (setupStep === 3) {
    html += '<h2>Цель и активность</h2>';
    html += '<div class="setup-field"><label>Целевой вес (кг):</label><input type="number" id="setupGoal" value="' + (state.profile.goal || '') + '" min="30" max="300" step="0.1" placeholder="Желаемый вес"></div>';
    var defDate = state.profile.date || '';
    if (!defDate) {
      var d = new Date();
      d.setMonth(d.getMonth() + 3);
      defDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    html += '<div class="setup-field"><label>Дата цели:</label><input type="date" id="setupDate" value="' + defDate + '"></div>';
    html += '<div class="setup-btns"><button class="btn" onclick="showSetup(2)">Назад</button><button class="btn btn-primary" onclick="nextSetup()">Далее</button></div>';
  } else if (setupStep === 4) {
    html += '<h2>Образ жизни</h2>';
    html += '<div class="setup-field"><label>Тип работы:</label><select id="setupJobType">';
    var jobs = [['office', 'Офис / сидячая'], ['remote', 'Удалёнка'], ['mixed', 'Смешанная'], ['physical', 'Физическая']];
    jobs.forEach(function (j) {
      html += '<option value="' + j[0] + '"' + (state.profile.jobType === j[0] ? ' selected' : '') + '>' + j[1] + '</option>';
    });
    html += '</select></div>';
    html += '<div class="setup-field"><label>Уровень активности:</label><select id="setupLifestyle">';
    var lifestyles = [['sedentary', 'Малоподвижный'], ['light', 'Лёгкая активность'], ['moderate', 'Умеренная'], ['active', 'Активный'], ['veryactive', 'Очень активный']];
    lifestyles.forEach(function (l) {
      html += '<option value="' + l[0] + '"' + (state.profile.lifestyle === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
    });
    html += '</select></div>';
    html += '<div class="setup-btns"><button class="btn" onclick="showSetup(3)">Назад</button><button class="btn btn-primary" onclick="finishSetup()">Готово</button></div>';
  }

  c.innerHTML = html;
}

function nextSetup() {
  if (setupStep === 1) {
    var age = parseInt(document.getElementById('setupAge').value);
    if (!state.profile.gender) { alert('Выберите пол'); return; }
    if (!age || age < 14 || age > 99) { alert('Укажите корректный возраст (14-99)'); return; }
    state.profile.age = age;
  } else if (setupStep === 2) {
    var w = parseFloat(document.getElementById('setupWeight').value);
    var h = parseFloat(document.getElementById('setupHeight').value);
    if (!w || w < 30) { alert('Укажите вес'); return; }
    if (!h || h < 100) { alert('Укажите рост'); return; }
    state.profile.weight = w;
    state.profile.height = h;
    // Save starting weight
    if (state.weightHistory.length === 0) {
      state.weightHistory.push({ date: today(), weight: w, time: nowTime() });
    }
  } else if (setupStep === 3) {
    var g = parseFloat(document.getElementById('setupGoal').value);
    var dt = document.getElementById('setupDate').value;
    if (!g || g < 30) { alert('Укажите целевой вес'); return; }
    if (!dt) { alert('Укажите дату цели'); return; }
    state.profile.goal = g;
    state.profile.date = dt;
  }
  setupStep++;
  saveState();
  renderSetupStep();
}

function finishSetup() {
  var jt = document.getElementById('setupJobType').value;
  var ls = document.getElementById('setupLifestyle').value;
  state.profile.jobType = jt;
  state.profile.lifestyle = ls;
  state.profile.activity = calcActivityCoeff(jt, ls);
  saveState();
  showMenu();
}

// --------------- MOTIVATION SECTION ---------------

var motivTab = 'videos';

function renderMotivationTabs() {
  var tabs = document.getElementById('motivTabs');
  var content = document.getElementById('motivContent');
  if (!tabs || !content) return;

  var tabDefs = [
    { id: 'videos', label: 'Видео' },
    { id: 'saved', label: 'Сохранённые' },
    { id: 'quotes', label: 'Цитаты' },
    { id: 'challenges', label: 'Челленджи' }
  ];
  tabs.innerHTML = tabDefs.map(function (t) {
    return '<button class="tab-btn ' + (motivTab === t.id ? 'active' : '') + '" onclick="motivTab=\'' + t.id + '\';renderMotivationTabs()">' + t.label + '</button>';
  }).join('');

  if (motivTab === 'videos') renderVideosTab(content);
  else if (motivTab === 'saved') renderSavedTab(content);
  else if (motivTab === 'quotes') renderQuotesTab(content);
  else if (motivTab === 'challenges') renderChallengesTab(content);
}

function renderVideosTab(container) {
  var cats = ['all', 'motivation', 'business', 'finance', 'entrepreneurship', 'discipline', 'sport', 'success'];
  var catLabels = { all: 'Все', motivation: 'Мотивация', business: 'Бизнес', finance: 'Финансы', entrepreneurship: 'Предпринимательство', discipline: 'Дисциплина', sport: 'Спорт', success: 'Успех' };

  var html = '<div class="cat-filters">';
  cats.forEach(function (c) {
    html += '<button class="cat-btn ' + (state.currentVideoCategory === c ? 'active' : '') + '" onclick="state.currentVideoCategory=\'' + c + '\';renderMotivationTabs()">' + catLabels[c] + '</button>';
  });
  html += '</div>';

  var videos = MOTIVATION_VIDEOS_DATA.filter(function (v) {
    if (state.watchedVideos.indexOf(v.id) !== -1 && state.savedVideos.indexOf(v.id) === -1) return false;
    return true;
  });

  // Simple category assignment based on index for demo purposes
  var categoryMap = {};
  MOTIVATION_VIDEOS_DATA.forEach(function (v, i) {
    var catsArr = ['motivation', 'discipline', 'business', 'finance', 'entrepreneurship', 'sport', 'success'];
    categoryMap[v.id] = catsArr[i % catsArr.length];
  });

  if (state.currentVideoCategory !== 'all') {
    videos = videos.filter(function (v) {
      return categoryMap[v.id] === state.currentVideoCategory;
    });
  }

  if (videos.length === 0) {
    html += '<div class="empty-msg">Все видео в этой категории просмотрены! Отличная работа!</div>';
  } else {
    html += '<div class="video-grid">';
    videos.forEach(function (v) {
      var isSaved = state.savedVideos.indexOf(v.id) !== -1;
      var isWatched = state.watchedVideos.indexOf(v.id) !== -1;
      var thumbUrl = '';
      var ytMatch = v.url.match(/embed\/([^?]+)/);
      if (ytMatch) thumbUrl = 'https://img.youtube.com/vi/' + ytMatch[1] + '/mqdefault.jpg';
      var cat = categoryMap[v.id] || 'motivation';

      html += '<div class="video-card' + (isWatched ? ' watched' : '') + '">';
      html += '<div class="video-thumb" onclick="playVideo(\'' + v.url + '\',\'' + v.id + '\')">';
      html += '<img src="' + thumbUrl + '" alt="' + v.title + '" loading="lazy">';
      html += '<div class="play-overlay">&#9654;</div>';
      html += '</div>';
      html += '<div class="video-info">';
      html += '<span class="cat-badge">' + (catLabels[cat] || cat) + '</span>';
      html += '<p class="video-title">' + v.title + '</p>';
      html += '<button class="save-btn ' + (isSaved ? 'saved' : '') + '" onclick="toggleSave(\'' + v.id + '\')">' + (isSaved ? '&#9829;' : '&#9825;') + '</button>';
      html += '</div></div>';
    });
    html += '</div>';
  }

  container.innerHTML = html;
}

function renderSavedTab(container) {
  var saved = MOTIVATION_VIDEOS_DATA.filter(function (v) {
    return state.savedVideos.indexOf(v.id) !== -1;
  });

  if (saved.length === 0) {
    container.innerHTML = '<div class="empty-msg">У вас нет сохранённых видео. Нажмите &#9825; чтобы сохранить.</div>';
    return;
  }

  var html = '<div class="video-grid">';
  saved.forEach(function (v) {
    var thumbUrl = '';
    var ytMatch = v.url.match(/embed\/([^?]+)/);
    if (ytMatch) thumbUrl = 'https://img.youtube.com/vi/' + ytMatch[1] + '/mqdefault.jpg';
    html += '<div class="video-card">';
    html += '<div class="video-thumb" onclick="playVideo(\'' + v.url + '\',\'' + v.id + '\')">';
    html += '<img src="' + thumbUrl + '" alt="' + v.title + '" loading="lazy">';
    html += '<div class="play-overlay">&#9654;</div>';
    html += '</div>';
    html += '<div class="video-info"><p class="video-title">' + v.title + '</p>';
    html += '<button class="save-btn saved" onclick="toggleSave(\'' + v.id + '\')">&#9829;</button>';
    html += '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

function playVideo(url, id) {
  if (state.watchedVideos.indexOf(id) === -1) {
    state.watchedVideos.push(id);
    saveState();
    checkAchievements();
  }
  var modal = document.getElementById('videoModal');
  var player = document.getElementById('videoPlayer');
  if (modal && player) {
    player.innerHTML = '<iframe width="100%" height="300" src="' + url + '?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    modal.classList.add('active');
  }
}

function closeVideoModal() {
  var modal = document.getElementById('videoModal');
  var player = document.getElementById('videoPlayer');
  if (modal) modal.classList.remove('active');
  if (player) player.innerHTML = '';
  renderMotivationTabs();
}

function toggleSave(id) {
  var idx = state.savedVideos.indexOf(id);
  if (idx === -1) state.savedVideos.push(id);
  else state.savedVideos.splice(idx, 1);
  saveState();
  renderMotivationTabs();
}

// --- Quotes ---
var quoteCat = 'all';

function renderQuotesTab(container) {
  var catsList = ['all', 'life', 'discipline', 'sport', 'success', 'change'];
  var catLabels = { all: 'Все', life: 'Жизнь', discipline: 'Дисциплина', sport: 'Спорт', success: 'Успех', change: 'Перемены' };

  var html = '<div class="cat-filters">';
  catsList.forEach(function (c) {
    html += '<button class="cat-btn ' + (quoteCat === c ? 'active' : '') + '" onclick="quoteCat=\'' + c + '\';renderMotivationTabs()">' + catLabels[c] + '</button>';
  });
  html += '</div>';

  var quotes = QUOTES_DATA;
  if (quoteCat !== 'all') {
    quotes = quotes.filter(function (q) { return q.category === quoteCat; });
  }

  html += '<div class="quotes-list">';
  quotes.forEach(function (q) {
    html += '<div class="quote-card">';
    html += '<div class="quote-text">&laquo;' + q.text + '&raquo;</div>';
    html += '<div class="quote-author">' + q.author + '</div>';
    html += '<div class="quote-desc">' + q.desc + '</div>';
    html += '</div>';
  });
  html += '</div>';
  container.innerHTML = html;
}

// --- Challenges ---

function renderChallengesTab(container) {
  var html = '<h3>30-дневный челлендж</h3>';
  html += '<div class="challenge-streak">Серия: ' + getChallengeStreak() + ' дней подряд</div>';

  html += '<div class="challenges-list">';
  DAILY_CHALLENGES.forEach(function (ch) {
    var done = state.completedChallenges.indexOf(ch.day) !== -1;
    var typeEmoji = { mindset: '🧠', health: '💪', action: '🎯' };
    html += '<div class="challenge-card ' + (done ? 'completed' : '') + '">';
    html += '<div class="challenge-header">';
    html += '<span class="challenge-day">День ' + ch.day + '</span>';
    html += '<span class="challenge-type">' + (typeEmoji[ch.type] || '') + '</span>';
    html += '</div>';
    html += '<div class="challenge-title">' + ch.title + '</div>';
    html += '<div class="challenge-desc">' + ch.desc + '</div>';
    if (!done) {
      html += '<button class="btn btn-sm" onclick="completeChallenge(' + ch.day + ')">Выполнено!</button>';
    } else {
      html += '<span class="done-mark">&#10003; Выполнено</span>';
    }
    html += '</div>';
  });
  html += '</div>';

  // Achievements
  html += '<h3>Достижения</h3><div class="achievements-grid">';
  ACHIEVEMENTS.forEach(function (a) {
    var unlocked = state.unlockedAchievements.indexOf(a.id) !== -1;
    html += '<div class="achievement-card ' + (unlocked ? 'unlocked' : 'locked') + '">';
    html += '<div class="achievement-emoji">' + a.emoji + '</div>';
    html += '<div class="achievement-name">' + a.name + '</div>';
    html += '<div class="achievement-desc">' + (unlocked ? a.desc : a.condition) + '</div>';
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function completeChallenge(day) {
  if (state.completedChallenges.indexOf(day) === -1) {
    state.completedChallenges.push(day);
    saveState();
    checkAchievements();
    renderMotivationTabs();
  }
}

function getChallengeStreak() {
  var sorted = state.completedChallenges.slice().sort(function (a, b) { return a - b; });
  var streak = 0;
  for (var i = sorted.length - 1; i >= 0; i--) {
    if (i === sorted.length - 1 || sorted[i] === sorted[i + 1] - 1) {
      streak++;
    } else break;
  }
  return streak;
}

// --------------- WEIGHT SECTION ---------------

var weightTab = 'dashboard';

function renderWeightTabs() {
  var tabs = document.getElementById('weightTabs');
  var content = document.getElementById('weightContent');
  if (!tabs || !content) return;

  var tabDefs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'food', label: 'Питание' },
    { id: 'water', label: 'Вода' },
    { id: 'diets', label: 'Диеты' },
    { id: 'exercises', label: 'Упражнения' }
  ];
  tabs.innerHTML = tabDefs.map(function (t) {
    return '<button class="tab-btn ' + (weightTab === t.id ? 'active' : '') + '" onclick="weightTab=\'' + t.id + '\';renderWeightTabs()">' + t.label + '</button>';
  }).join('');

  if (weightTab === 'dashboard') renderDashboard(content);
  else if (weightTab === 'food') renderFoodTab(content);
  else if (weightTab === 'water') renderWaterTab(content);
  else if (weightTab === 'diets') renderDietsTab(content);
  else if (weightTab === 'exercises') renderExercisesTab(content);
}

// --- Dashboard ---

function renderDashboard(container) {
  var p = state.profile;
  var tdee = Math.round(calcTDEE(p));
  var bmr = Math.round(calcBMR(p));
  var target = calcTargetCalories(p);
  var deficit = Math.round(calcDeficit(p));
  var bmi = calcBMI(p.weight, p.height);
  var bmiCat = bmiCategory(bmi);
  var macros = calcMacros(target, state.selectedDiet);
  var wNorm = waterNorm();
  var todayFood = getTodayFood();
  var todayExercise = getTodayExercise();
  var startWeight = state.weightHistory.length > 0 ? state.weightHistory[0].weight : p.weight;
  var currentWeight = getCurrentWeight();
  var weightDiff = (currentWeight - startWeight).toFixed(1);

  // Motivational banner
  var quoteIdx = Math.floor(Math.random() * WEIGHT_QUOTES_DATA.length);
  var html = '<div class="motiv-banner">' + WEIGHT_QUOTES_DATA[quoteIdx] + '</div>';

  // Body params
  html += '<div class="dash-card">';
  html += '<h3>Параметры тела</h3>';
  html += '<div class="param-row"><span>Текущий вес:</span><strong>' + currentWeight + ' кг</strong></div>';
  html += '<div class="param-row"><span>Стартовый вес:</span><strong>' + startWeight + ' кг</strong></div>';
  html += '<div class="param-row"><span>Разница:</span><strong style="color:' + (parseFloat(weightDiff) <= 0 ? '#27ae60' : '#e74c3c') + '">' + (parseFloat(weightDiff) > 0 ? '+' : '') + weightDiff + ' кг</strong></div>';
  html += '<div class="param-row"><span>Рост:</span><strong>' + p.height + ' см</strong></div>';
  html += '<div class="param-row"><span>ИМТ:</span><strong style="color:' + bmiCat.color + '">' + bmi.toFixed(1) + ' — ' + bmiCat.text + '</strong></div>';
  html += '</div>';

  // Calorie card
  html += '<div class="dash-card">';
  html += '<h3>Калории</h3>';
  html += '<div class="param-row"><span>Поддержание (TDEE):</span><strong>' + tdee + ' ккал</strong></div>';
  html += '<div class="param-row"><span>Рекомендуемая цель:</span><strong class="highlight">' + target + ' ккал</strong></div>';
  html += '<div class="param-row"><span>Базовый обмен (BMR):</span><strong>' + bmr + ' ккал</strong></div>';
  html += '<div class="param-row"><span>Дневной дефицит:</span><strong>' + deficit + ' ккал</strong></div>';
  html += '</div>';

  // Daily norms
  html += '<div class="dash-card">';
  html += '<h3>Дневные нормы</h3>';
  html += '<div class="param-row"><span>Белки:</span><strong>' + macros.protein + ' г</strong></div>';
  html += '<div class="param-row"><span>Жиры:</span><strong>' + macros.fat + ' г</strong></div>';
  html += '<div class="param-row"><span>Углеводы:</span><strong>' + macros.carbs + ' г</strong></div>';
  html += '<div class="param-row"><span>Сахар (макс ВОЗ):</span><strong>25 г</strong></div>';
  html += '<div class="param-row"><span>Соль (макс ВОЗ):</span><strong>5 г</strong></div>';
  html += '<div class="param-row"><span>Клетчатка:</span><strong>25-30 г</strong></div>';
  html += '<div class="param-row"><span>Вода:</span><strong>' + (wNorm / 1000).toFixed(1) + ' л</strong></div>';
  html += '</div>';

  // Today's eaten
  html += '<div class="dash-card">';
  html += '<h3>Сегодня съедено</h3>';
  var eatenKcal = todayFood.kcal;
  var eatenP = todayFood.p;
  var eatenF = todayFood.f;
  var eatenC = todayFood.c;
  var burnedKcal = todayExercise.calories;

  html += '<div class="param-row"><span>Калории:</span><strong>' + eatenKcal + ' / ' + target + ' ккал</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (eatenKcal / target) * 100) + '%;background:' + (eatenKcal > target ? '#e74c3c' : '#27ae60') + '"></div></div>';
  html += '<div class="param-row"><span>Белки:</span><strong>' + eatenP + ' / ' + macros.protein + ' г</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (eatenP / macros.protein) * 100) + '%"></div></div>';
  html += '<div class="param-row"><span>Жиры:</span><strong>' + eatenF + ' / ' + macros.fat + ' г</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (eatenF / macros.fat) * 100) + '%"></div></div>';
  html += '<div class="param-row"><span>Углеводы:</span><strong>' + eatenC + ' / ' + macros.carbs + ' г</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (eatenC / macros.carbs) * 100) + '%"></div></div>';
  if (burnedKcal > 0) {
    html += '<div class="param-row"><span>Сожжено упражнениями:</span><strong style="color:#27ae60">-' + burnedKcal + ' ккал</strong></div>';
  }
  html += '</div>';

  // Predictions
  html += '<div class="dash-card">';
  html += '<h3>Прогнозы</h3>';
  var netCalories = eatenKcal - burnedKcal;
  var effectiveDeficit = tdee - netCalories;
  if (effectiveDeficit > 0) {
    var dailyKgLoss = effectiveDeficit / 7700;
    html += '<div class="param-row"><span>Завтра:</span><strong style="color:#27ae60">-' + dailyKgLoss.toFixed(3) + ' кг</strong></div>';
    html += '<div class="param-row"><span>За неделю:</span><strong style="color:#27ae60">-' + (dailyKgLoss * 7).toFixed(1) + ' кг</strong></div>';
    html += '<div class="param-row"><span>За месяц:</span><strong style="color:#27ae60">-' + (dailyKgLoss * 30).toFixed(1) + ' кг</strong></div>';
  } else {
    html += '<div class="prediction-warning">&#9888; При текущем питании вес будет расти</div>';
    var dailyKgGain = Math.abs(effectiveDeficit) / 7700;
    html += '<div class="param-row"><span>За неделю:</span><strong style="color:#e74c3c">+' + (dailyKgGain * 7).toFixed(1) + ' кг</strong></div>';
    html += '<div class="param-row"><span>За месяц:</span><strong style="color:#e74c3c">+' + (dailyKgGain * 30).toFixed(1) + ' кг</strong></div>';
  }
  html += '</div>';

  // Weight input
  html += '<div class="dash-card">';
  html += '<h3>Записать вес</h3>';
  html += '<div class="weight-input-row"><input type="number" id="weightInput" step="0.1" min="30" max="300" placeholder="Ваш вес"><button class="btn btn-primary" onclick="recordWeight()">Записать</button></div>';
  html += '</div>';

  // Buttons
  html += '<div class="dash-actions">';
  html += '<button class="btn" onclick="showWeightHistory()">История веса</button>';
  html += '<button class="btn" onclick="showEditProfile()">Редактировать цели</button>';
  html += '<button class="btn btn-danger" onclick="resetApp()">Сбросить данные</button>';
  html += '</div>';

  container.innerHTML = html;
}

function getCurrentWeight() {
  if (state.weightHistory.length === 0) return state.profile.weight;
  return state.weightHistory[state.weightHistory.length - 1].weight;
}

function getTodayFood() {
  var items = state.foodLog[today()] || [];
  var result = { kcal: 0, p: 0, f: 0, c: 0 };
  items.forEach(function (item) {
    result.kcal += item.kcal || 0;
    result.p += item.p || 0;
    result.f += item.f || 0;
    result.c += item.c || 0;
  });
  result.kcal = Math.round(result.kcal);
  result.p = Math.round(result.p);
  result.f = Math.round(result.f);
  result.c = Math.round(result.c);
  return result;
}

function getTodayExercise() {
  var items = state.exerciseLog[today()] || [];
  var result = { duration: 0, calories: 0 };
  items.forEach(function (item) {
    result.duration += item.duration || 0;
    result.calories += item.calories || 0;
  });
  return result;
}

function recordWeight() {
  var input = document.getElementById('weightInput');
  if (!input) return;
  var w = parseFloat(input.value);
  if (!w || w < 30 || w > 300) { alert('Укажите корректный вес'); return; }
  state.weightHistory.push({ date: today(), weight: w, time: nowTime() });
  state.profile.weight = w;
  saveState();
  checkAchievements();
  renderWeightTabs();
}

// --- Weight History Modal ---

var historyView = 'all';

function showWeightHistory() {
  var modal = document.getElementById('weightHistoryModal');
  if (!modal) return;
  renderWeightHistoryContent();
  modal.classList.add('active');
}

function closeWeightHistory() {
  var modal = document.getElementById('weightHistoryModal');
  if (modal) modal.classList.remove('active');
}

function renderWeightHistoryContent() {
  var body = document.getElementById('weightHistoryBody');
  if (!body) return;

  var html = '<div class="history-toggle">';
  html += '<button class="btn btn-sm ' + (historyView === 'all' ? 'btn-active' : '') + '" onclick="historyView=\'all\';renderWeightHistoryContent()">Все</button>';
  html += '<button class="btn btn-sm ' + (historyView === 'week' ? 'btn-active' : '') + '" onclick="historyView=\'week\';renderWeightHistoryContent()">Неделя</button>';
  html += '<button class="btn btn-sm ' + (historyView === 'month' ? 'btn-active' : '') + '" onclick="historyView=\'month\';renderWeightHistoryContent()">Месяц</button>';
  html += '</div>';

  var entries = state.weightHistory.slice();
  if (historyView === 'week') {
    var weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    entries = entries.filter(function (e) { return new Date(e.date) >= weekAgo; });
  } else if (historyView === 'month') {
    var monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    entries = entries.filter(function (e) { return new Date(e.date) >= monthAgo; });
  }

  if (entries.length === 0) {
    html += '<p class="empty-msg">Нет записей</p>';
  } else {
    html += '<table class="history-table"><thead><tr><th>Дата</th><th>Время</th><th>Вес</th><th>Изменение</th></tr></thead><tbody>';
    entries.forEach(function (e, i) {
      var change = '';
      if (i > 0) {
        var diff = e.weight - entries[i - 1].weight;
        var sign = diff > 0 ? '+' : '';
        var color = diff > 0 ? '#e74c3c' : diff < 0 ? '#27ae60' : '#666';
        change = '<span style="color:' + color + '">' + sign + diff.toFixed(1) + '</span>';
      }
      html += '<tr><td>' + formatDate(e.date) + '</td><td>' + (e.time || '') + '</td><td>' + e.weight + ' кг</td><td>' + change + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  body.innerHTML = html;
}

// --- Food Tracker ---

function renderFoodTab(container) {
  var target = calcTargetCalories(state.profile);
  var todayF = getTodayFood();
  var macros = calcMacros(target, state.selectedDiet);
  var remaining = target - todayF.kcal;

  var html = '<div class="dash-card">';
  html += '<h3>Питание сегодня</h3>';
  html += '<div class="param-row"><span>Съедено:</span><strong>' + todayF.kcal + ' ккал</strong></div>';
  html += '<div class="param-row"><span>Цель:</span><strong>' + target + ' ккал</strong></div>';
  html += '<div class="param-row"><span>Осталось:</span><strong style="color:' + (remaining >= 0 ? '#27ae60' : '#e74c3c') + '">' + remaining + ' ккал</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (todayF.kcal / target) * 100) + '%;background:' + (todayF.kcal > target ? '#e74c3c' : '#27ae60') + '"></div></div>';

  // Macros progress
  html += '<div class="macros-row">';
  html += '<div class="macro-item"><span>Б: ' + todayF.p + '/' + macros.protein + '</span><div class="progress-bar small"><div class="progress-fill prot" style="width:' + Math.min(100, (todayF.p / macros.protein) * 100) + '%"></div></div></div>';
  html += '<div class="macro-item"><span>Ж: ' + todayF.f + '/' + macros.fat + '</span><div class="progress-bar small"><div class="progress-fill fat" style="width:' + Math.min(100, (todayF.f / macros.fat) * 100) + '%"></div></div></div>';
  html += '<div class="macro-item"><span>У: ' + todayF.c + '/' + macros.carbs + '</span><div class="progress-bar small"><div class="progress-fill carb" style="width:' + Math.min(100, (todayF.c / macros.carbs) * 100) + '%"></div></div></div>';
  html += '</div>';
  html += '</div>';

  html += '<button class="btn btn-primary btn-full" onclick="showFoodModal()">+ Добавить еду</button>';

  // Today's food list
  var todayItems = state.foodLog[today()] || [];
  if (todayItems.length > 0) {
    html += '<div class="food-list">';
    todayItems.forEach(function (item, i) {
      html += '<div class="food-item">';
      html += '<div class="food-item-info">';
      html += '<strong>' + item.name + '</strong> <small>(' + item.grams + ' г)</small>';
      html += '<div class="food-item-macros">' + item.kcal + ' ккал | Б:' + item.p + ' Ж:' + item.f + ' У:' + item.c + '</div>';
      html += '</div>';
      html += '<button class="btn btn-sm btn-danger" onclick="deleteFoodItem(' + i + ')">&#10005;</button>';
      html += '</div>';
    });
    html += '</div>';
  }

  container.innerHTML = html;
}

function showFoodModal() {
  var modal = document.getElementById('foodModal');
  if (modal) modal.classList.add('active');
  var searchInput = document.getElementById('foodSearch');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  renderFoodSearch('');
}

function closeFoodModal() {
  var modal = document.getElementById('foodModal');
  if (modal) modal.classList.remove('active');
}

function searchFood() {
  var val = document.getElementById('foodSearch').value;
  renderFoodSearch(val);
}

function renderFoodSearch(query) {
  var results = document.getElementById('foodSearchResults');
  if (!results) return;

  if (!query || query.length < 1) {
    // Show categories
    results.innerHTML = '<p class="hint">Начните вводить название продукта</p>' +
      '<div class="manual-entry"><h4>Или введите вручную:</h4>' +
      '<input type="text" id="manualName" placeholder="Название">' +
      '<input type="number" id="manualKcal" placeholder="Ккал на 100г">' +
      '<input type="number" id="manualP" placeholder="Белки на 100г">' +
      '<input type="number" id="manualF" placeholder="Жиры на 100г">' +
      '<input type="number" id="manualC" placeholder="Углеводы на 100г">' +
      '<input type="number" id="manualGrams" placeholder="Граммы" value="100">' +
      '<button class="btn btn-primary" onclick="addManualFood()">Добавить</button></div>';
    return;
  }

  var q = query.toLowerCase();
  var matches = FOOD_DB.filter(function (f) {
    return f.name.toLowerCase().indexOf(q) !== -1;
  });

  var html = '';
  if (matches.length === 0) {
    html = '<p class="hint">Ничего не найдено</p>';
  } else {
    matches.slice(0, 30).forEach(function (f, i) {
      var origIdx = FOOD_DB.indexOf(f);
      html += '<div class="food-search-item" onclick="quickAddFood(' + origIdx + ')">';
      html += '<div><strong>' + f.name + '</strong>';
      if (f.isJunk) html += ' <span class="junk-badge">&#9888;</span>';
      html += '</div>';
      html += '<div class="food-search-macros">' + f.kcal + ' ккал | Б:' + f.p + ' Ж:' + f.f + ' У:' + f.c + ' (на 100г)</div>';
      html += '</div>';
    });
  }

  // Manual entry
  html += '<div class="manual-entry"><h4>Или введите вручную:</h4>' +
    '<input type="text" id="manualName" placeholder="Название">' +
    '<input type="number" id="manualKcal" placeholder="Ккал на 100г">' +
    '<input type="number" id="manualP" placeholder="Белки на 100г">' +
    '<input type="number" id="manualF" placeholder="Жиры на 100г">' +
    '<input type="number" id="manualC" placeholder="Углеводы на 100г">' +
    '<input type="number" id="manualGrams" placeholder="Граммы" value="100">' +
    '<button class="btn btn-primary" onclick="addManualFood()">Добавить</button></div>';

  results.innerHTML = html;
}

function quickAddFood(dbIndex) {
  var food = FOOD_DB[dbIndex];
  if (!food) return;

  if (food.isJunk) {
    showJunkWarning(function () {
      promptGramsAndAdd(food);
    });
    return;
  }

  promptGramsAndAdd(food);
}

function promptGramsAndAdd(food) {
  var grams = prompt('Сколько грамм? (по умолчанию 100)', '100');
  if (grams === null) return;
  grams = parseFloat(grams) || 100;
  var ratio = grams / food.per;

  var entry = {
    name: food.name,
    kcal: Math.round(food.kcal * ratio),
    p: Math.round(food.p * ratio * 10) / 10,
    f: Math.round(food.f * ratio * 10) / 10,
    c: Math.round(food.c * ratio * 10) / 10,
    grams: grams
  };

  addFoodEntry(entry);
}

function addManualFood() {
  var name = document.getElementById('manualName').value;
  var kcal = parseFloat(document.getElementById('manualKcal').value);
  var p = parseFloat(document.getElementById('manualP').value) || 0;
  var f = parseFloat(document.getElementById('manualF').value) || 0;
  var c = parseFloat(document.getElementById('manualC').value) || 0;
  var grams = parseFloat(document.getElementById('manualGrams').value) || 100;

  if (!name) { alert('Укажите название'); return; }
  if (!kcal && kcal !== 0) { alert('Укажите калорийность'); return; }

  var ratio = grams / 100;
  var entry = {
    name: name,
    kcal: Math.round(kcal * ratio),
    p: Math.round(p * ratio * 10) / 10,
    f: Math.round(f * ratio * 10) / 10,
    c: Math.round(c * ratio * 10) / 10,
    grams: grams
  };

  addFoodEntry(entry);
}

function addFoodEntry(entry) {
  var d = today();
  if (!state.foodLog[d]) state.foodLog[d] = [];
  state.foodLog[d].push(entry);
  saveState();
  closeFoodModal();
  checkAchievements();
  renderWeightTabs();
}

function deleteFoodItem(index) {
  var d = today();
  if (state.foodLog[d]) {
    state.foodLog[d].splice(index, 1);
    saveState();
    renderWeightTabs();
  }
}

function showJunkWarning(callback) {
  var modal = document.getElementById('junkWarningModal');
  var msgEl = document.getElementById('junkWarningMsg');
  if (modal && msgEl) {
    var idx = Math.floor(Math.random() * JUNK_FOOD_WARNINGS.length);
    msgEl.textContent = JUNK_FOOD_WARNINGS[idx];
    modal.classList.add('active');
    window._junkCallback = callback;
  }
}

function junkProceed() {
  var modal = document.getElementById('junkWarningModal');
  if (modal) modal.classList.remove('active');
  if (window._junkCallback) {
    window._junkCallback();
    window._junkCallback = null;
  }
}

function junkCancel() {
  var modal = document.getElementById('junkWarningModal');
  if (modal) modal.classList.remove('active');
  window._junkCallback = null;
}

// --- Water Tracker ---

function renderWaterTab(container) {
  var d = today();
  var drunk = state.waterLog[d] || 0;
  var norm = waterNorm();
  var glasses = glassesNeeded();
  var glassesDrunk = Math.floor(drunk / 250);

  var html = '<div class="dash-card">';
  html += '<h3>Водный баланс</h3>';
  html += '<div class="water-norm">Норма: ' + (norm / 1000).toFixed(1) + ' л (' + glasses + ' стаканов)</div>';
  html += '<div class="water-progress">';
  html += '<div class="water-bar"><div class="water-fill" style="width:' + Math.min(100, (drunk / norm) * 100) + '%"></div></div>';
  html += '<div class="water-text">' + (drunk / 1000).toFixed(1) + ' / ' + (norm / 1000).toFixed(1) + ' л</div>';
  html += '</div>';

  // Glasses
  html += '<div class="glasses-grid">';
  for (var i = 0; i < glasses; i++) {
    var filled = i < glassesDrunk;
    html += '<div class="glass ' + (filled ? 'filled' : '') + '" onclick="drinkGlass(' + i + ')">&#128167;</div>';
  }
  html += '</div>';

  html += '<button class="btn btn-sm" onclick="resetWater()">Сбросить</button>';
  html += '</div>';

  // Schedule
  html += '<div class="dash-card">';
  html += '<h3>Рекомендованный график</h3>';
  html += '<div class="water-schedule">';
  WATER_SCHEDULE.forEach(function (s) {
    html += '<div class="schedule-item"><span class="schedule-time">' + s.time + '</span><span class="schedule-amount">' + s.amount + ' мл</span><span class="schedule-note">' + s.note + '</span></div>';
  });
  html += '</div></div>';

  // Random tip
  var tipIdx = Math.floor(Math.random() * WATER_TIPS.length);
  var tip = WATER_TIPS[tipIdx];
  html += '<div class="dash-card tip-card">';
  html += '<h3>&#128161; ' + tip.title + '</h3>';
  html += '<p>' + tip.text + '</p>';
  html += '</div>';

  container.innerHTML = html;
}

function drinkGlass(index) {
  var d = today();
  var current = state.waterLog[d] || 0;
  var targetMl = (index + 1) * 250;
  if (current < targetMl) {
    state.waterLog[d] = targetMl;
  }
  saveState();
  checkAchievements();
  renderWeightTabs();
}

function resetWater() {
  state.waterLog[today()] = 0;
  saveState();
  renderWeightTabs();
}

// --- Diets ---

var expandedDiet = -1;

function renderDietsTab(container) {
  var html = '<div class="diets-list">';

  DIETS_DATA.forEach(function (diet, i) {
    var isSelected = state.selectedDiet === i;
    var isExpanded = expandedDiet === i;

    html += '<div class="diet-card ' + (isSelected ? 'selected' : '') + '">';
    html += '<div class="diet-header" onclick="expandedDiet=' + (isExpanded ? -1 : i) + ';renderWeightTabs()">';
    html += '<h3>' + diet.name + (isSelected ? ' &#10003;' : '') + '</h3>';
    html += '<span class="expand-icon">' + (isExpanded ? '&#9650;' : '&#9660;') + '</span>';
    html += '</div>';
    html += '<p class="diet-desc">' + diet.desc + '</p>';
    html += '<div class="diet-ratios">';
    html += '<span class="ratio-badge">Б:' + diet.ratio.p + '%</span>';
    html += '<span class="ratio-badge">Ж:' + diet.ratio.f + '%</span>';
    html += '<span class="ratio-badge">У:' + diet.ratio.c + '%</span>';
    html += '</div>';

    if (isExpanded) {
      html += '<div class="diet-details">';
      // Pros
      html += '<h4>&#10004; Плюсы:</h4><ul>';
      diet.pros.forEach(function (p) { html += '<li>' + p + '</li>'; });
      html += '</ul>';
      // Cons
      html += '<h4>&#10008; Минусы:</h4><ul>';
      diet.cons.forEach(function (c) { html += '<li>' + c + '</li>'; });
      html += '</ul>';
      // Daily menu
      html += '<h4>Примерное меню на день:</h4><div class="menu-list">';
      diet.menu.forEach(function (m) {
        html += '<div class="menu-item"><span class="menu-time">' + m.time + '</span><span>' + m.meal + '</span></div>';
      });
      html += '</div>';
      // Weekly menu
      if (diet.weekMenu) {
        html += '<h4>Меню на неделю:</h4>';
        var dayNames = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
        var days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach(function (day) {
          if (diet.weekMenu[day]) {
            html += '<h5>' + dayNames[day] + '</h5><div class="menu-list">';
            diet.weekMenu[day].forEach(function (m) {
              html += '<div class="menu-item"><span class="menu-time">' + m.time + '</span><span>' + m.meal + '</span></div>';
            });
            html += '</div>';
          }
        });
      }
      html += '</div>';
    }

    if (!isSelected) {
      html += '<button class="btn btn-primary btn-sm" onclick="selectDiet(' + i + ')">Выбрать</button>';
    }
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function selectDiet(index) {
  state.selectedDiet = index;
  saveState();
  renderWeightTabs();
}

// --- Exercises ---

var exerciseCat = 'all';

function renderExercisesTab(container) {
  var cats = ['all', 'cardio', 'strength', 'stretch', 'core'];
  var catLabels = { all: 'Все', cardio: 'Кардио', strength: 'Сила', stretch: 'Растяжка', core: 'Кор' };

  var html = '<div class="cat-filters">';
  cats.forEach(function (c) {
    html += '<button class="cat-btn ' + (exerciseCat === c ? 'active' : '') + '" onclick="exerciseCat=\'' + c + '\';renderWeightTabs()">' + catLabels[c] + '</button>';
  });
  html += '</div>';

  // Today's exercise summary
  var todayEx = getTodayExercise();
  var exerciseGoal = 30; // 30 min minimum
  html += '<div class="dash-card">';
  html += '<h3>Тренировка сегодня</h3>';
  html += '<div class="param-row"><span>Время:</span><strong>' + todayEx.duration + ' / ' + exerciseGoal + ' мин</strong></div>';
  html += '<div class="progress-bar"><div class="progress-fill" style="width:' + Math.min(100, (todayEx.duration / exerciseGoal) * 100) + '%"></div></div>';
  html += '<div class="param-row"><span>Сожжено:</span><strong>' + todayEx.calories + ' ккал</strong></div>';
  if (todayEx.duration >= exerciseGoal) {
    html += '<div class="done-mark">&#10003; Дневная цель выполнена!</div>';
  } else {
    html += '<div class="hint">Рекомендуется минимум ' + exerciseGoal + ' минут активности в день</div>';
  }
  html += '</div>';

  // Exercise cards
  var exercises = EXERCISES_DATA;
  if (exerciseCat !== 'all') {
    exercises = exercises.filter(function (e) { return e.category === exerciseCat; });
  }

  html += '<div class="exercises-list">';
  exercises.forEach(function (ex, i) {
    var origIdx = EXERCISES_DATA.indexOf(ex);
    var stars = '';
    for (var s = 0; s < 3; s++) {
      stars += s < ex.difficulty ? '&#9733;' : '&#9734;';
    }

    html += '<div class="exercise-card">';
    html += '<div class="exercise-header">';
    html += '<span class="exercise-emoji">' + ex.emoji + '</span>';
    html += '<div class="exercise-title-block">';
    html += '<strong>' + ex.name + '</strong>';
    html += '<div class="exercise-diff">' + stars + '</div>';
    html += '</div></div>';
    html += '<div class="exercise-info">';
    html += '<div><small>Мышцы:</small> ' + ex.muscles + '</div>';
    html += '<div><small>Подходы:</small> ' + ex.sets + '</div>';
    html += '<div class="exercise-desc">' + ex.desc + '</div>';
    html += '<div><small>~' + ex.calories_per_min + ' ккал/мин</small></div>';
    html += '</div>';
    html += '<button class="btn btn-primary btn-sm" onclick="startExercise(' + origIdx + ')">Начать</button>';
    html += '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function startExercise(exIdx) {
  var ex = EXERCISES_DATA[exIdx];
  if (!ex) return;
  exerciseCurrentIdx = exIdx;
  exerciseElapsed = 0;

  var modal = document.getElementById('exerciseTimerModal');
  var nameEl = document.getElementById('exerciseTimerName');
  var timerEl = document.getElementById('exerciseTimerDisplay');
  var calEl = document.getElementById('exerciseTimerCalories');

  if (nameEl) nameEl.textContent = ex.emoji + ' ' + ex.name;
  if (timerEl) timerEl.textContent = '00:00';
  if (calEl) calEl.textContent = '0 ккал';

  exerciseStartTime = Date.now();
  exerciseTimer = setInterval(function () {
    exerciseElapsed = Math.floor((Date.now() - exerciseStartTime) / 1000);
    var mins = Math.floor(exerciseElapsed / 60);
    var secs = exerciseElapsed % 60;
    if (timerEl) timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    var calsBurned = Math.round((exerciseElapsed / 60) * ex.calories_per_min);
    if (calEl) calEl.textContent = calsBurned + ' ккал';
  }, 1000);

  if (modal) modal.classList.add('active');
}

function stopExercise() {
  if (exerciseTimer) {
    clearInterval(exerciseTimer);
    exerciseTimer = null;
  }

  var ex = EXERCISES_DATA[exerciseCurrentIdx];
  if (!ex) return;

  var durationMin = Math.round(exerciseElapsed / 60);
  var caloriesBurned = Math.round((exerciseElapsed / 60) * ex.calories_per_min);

  if (durationMin > 0) {
    var d = today();
    if (!state.exerciseLog[d]) state.exerciseLog[d] = [];
    state.exerciseLog[d].push({
      name: ex.name,
      duration: durationMin,
      calories: caloriesBurned
    });
    saveState();
    checkAchievements();
  }

  var modal = document.getElementById('exerciseTimerModal');
  if (modal) modal.classList.remove('active');
  exerciseCurrentIdx = null;
  exerciseElapsed = 0;
  renderWeightTabs();
}

// --------------- EDIT PROFILE ---------------

function showEditProfile() {
  var modal = document.getElementById('editProfileModal');
  if (!modal) return;

  var p = state.profile;
  var html = '<h3>Редактировать профиль</h3>';
  html += '<div class="edit-field"><label>Пол:</label><select id="editGender"><option value="male"' + (p.gender === 'male' ? ' selected' : '') + '>Мужской</option><option value="female"' + (p.gender === 'female' ? ' selected' : '') + '>Женский</option></select></div>';
  html += '<div class="edit-field"><label>Возраст:</label><input type="number" id="editAge" value="' + p.age + '"></div>';
  html += '<div class="edit-field"><label>Вес (кг):</label><input type="number" id="editWeight" value="' + p.weight + '" step="0.1"></div>';
  html += '<div class="edit-field"><label>Рост (см):</label><input type="number" id="editHeight" value="' + p.height + '"></div>';
  html += '<div class="edit-field"><label>Цель (кг):</label><input type="number" id="editGoal" value="' + p.goal + '" step="0.1"></div>';
  html += '<div class="edit-field"><label>Дата цели:</label><input type="date" id="editDate" value="' + p.date + '"></div>';
  html += '<div class="edit-field"><label>Тип работы:</label><select id="editJobType">';
  [['office', 'Офис'], ['remote', 'Удалёнка'], ['mixed', 'Смешанная'], ['physical', 'Физическая']].forEach(function (j) {
    html += '<option value="' + j[0] + '"' + (p.jobType === j[0] ? ' selected' : '') + '>' + j[1] + '</option>';
  });
  html += '</select></div>';
  html += '<div class="edit-field"><label>Активность:</label><select id="editLifestyle">';
  [['sedentary', 'Малоподвижный'], ['light', 'Лёгкая'], ['moderate', 'Умеренная'], ['active', 'Активный'], ['veryactive', 'Очень активный']].forEach(function (l) {
    html += '<option value="' + l[0] + '"' + (p.lifestyle === l[0] ? ' selected' : '') + '>' + l[1] + '</option>';
  });
  html += '</select></div>';
  html += '<div class="edit-btns"><button class="btn btn-primary" onclick="saveEditProfile()">Сохранить</button><button class="btn" onclick="closeEditProfile()">Отмена</button></div>';

  var body = document.getElementById('editProfileBody');
  if (body) body.innerHTML = html;
  modal.classList.add('active');
}

function closeEditProfile() {
  var modal = document.getElementById('editProfileModal');
  if (modal) modal.classList.remove('active');
}

function saveEditProfile() {
  state.profile.gender = document.getElementById('editGender').value;
  state.profile.age = parseInt(document.getElementById('editAge').value) || state.profile.age;
  state.profile.weight = parseFloat(document.getElementById('editWeight').value) || state.profile.weight;
  state.profile.height = parseFloat(document.getElementById('editHeight').value) || state.profile.height;
  state.profile.goal = parseFloat(document.getElementById('editGoal').value) || state.profile.goal;
  state.profile.date = document.getElementById('editDate').value || state.profile.date;
  state.profile.jobType = document.getElementById('editJobType').value;
  state.profile.lifestyle = document.getElementById('editLifestyle').value;
  state.profile.activity = calcActivityCoeff(state.profile.jobType, state.profile.lifestyle);
  saveState();
  closeEditProfile();
  renderWeightTabs();
}

// --------------- RESET ---------------

function resetApp() {
  if (!confirm('Вы уверены? Все данные будут удалены')) return;
  localStorage.removeItem('motivApp2');
  state = {
    introSeen: false,
    profile: {
      gender: '', age: 0, weight: 0, height: 0,
      goal: 0, date: '', activity: 1.55,
      jobType: 'office', lifestyle: 'moderate'
    },
    watchedVideos: [],
    savedVideos: [],
    foodLog: {},
    waterLog: {},
    weightHistory: [],
    selectedDiet: 0,
    completedChallenges: [],
    unlockedAchievements: [],
    exerciseLog: {},
    currentVideoCategory: 'all'
  };
  showSetup(1);
}

// --------------- ACHIEVEMENTS ---------------

function checkAchievements() {
  var startWeight = state.weightHistory.length > 0 ? state.weightHistory[0].weight : state.profile.weight;
  var currentWeight = getCurrentWeight();
  var lostKg = startWeight - currentWeight;

  function unlock(id) {
    if (state.unlockedAchievements.indexOf(id) === -1) {
      state.unlockedAchievements.push(id);
    }
  }

  // a1 — first exercise
  var totalExercises = 0;
  for (var d in state.exerciseLog) {
    totalExercises += state.exerciseLog[d].length;
  }
  if (totalExercises >= 1) unlock('a1');
  if (totalExercises >= 10) unlock('a8');

  // a3 — lost 1 kg
  if (lostKg >= 1) unlock('a3');
  // a9 — lost 5 kg
  if (lostKg >= 5) unlock('a9');
  // a12 — lost 10 kg
  if (lostKg >= 10) unlock('a12');

  // a10 — watched 5 videos
  if (state.watchedVideos.length >= 5) unlock('a10');

  // a11 — 15 challenges completed
  if (state.completedChallenges.length >= 15) unlock('a11');

  // a15 — reached goal weight
  if (state.profile.goal && currentWeight <= state.profile.goal) unlock('a15');

  // a2 — 7 day streak (challenge streak)
  if (getChallengeStreak() >= 7) unlock('a2');
  // a13 — 30 day streak
  if (getChallengeStreak() >= 30) unlock('a13');

  // a4 — water norm 5 days in a row
  var waterStreak = 0;
  var norm = waterNorm();
  for (var i = 0; i < 30; i++) {
    var checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    var ds = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
    if ((state.waterLog[ds] || 0) >= norm) waterStreak++;
    else break;
  }
  if (waterStreak >= 5) unlock('a4');

  saveState();
}

// --------------- INITIALIZATION ---------------

function initApp() {
  loadState();

  if (!state.introSeen) {
    showIntro();
  } else if (!state.profile.gender) {
    showSetup(1);
  } else {
    showMenu();
  }
}

// Run on load
window.addEventListener('DOMContentLoaded', initApp);
