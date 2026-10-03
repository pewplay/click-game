(function () {
  'use strict';

  // ---------- data ----------
  var data = {
    animal: Object.keys(ICONS.animal),
    object: Object.keys(ICONS.object),
    letter: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
    number: '0123456789'.split(''),
    colors: [
      '#f4dbb0', '#ff1515', '#ffe066', '#e1eeff', '#272951', '#1f7150', '#484e75',
      '#5e4474', '#c5e6a6', '#3bbf45', '#e5d5c1', '#231a4f', '#ecefe9', '#322671',
      '#0a0a15', '#e3c7cb', '#6015a1', '#ff7a1a', '#ffaacc'
    ]
  };

  // ---------- storage (prefixed keys) ----------
  var KEY_BEST = 'click-game:best';
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, val) { try { localStorage.setItem(key, String(val)); } catch (e) { /* ignore */ } }
  var best = parseInt(load(KEY_BEST), 10) || 0;

  // ---------- elements ----------
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    startScreen: $('play-screen'),
    optionScreen: $('select-screen'),
    gameScreen: $('game-screen'),
    field: $('field'),
    time: $('time'),
    score: $('score'),
    message: $('message'),
    checkpointScore: $('checkpoint-score'),
    results: $('results'),
    paused: $('paused'),
    hint: $('hint'),
    bestLine: $('best-line'),
    bestStart: $('best-start'),
    finalScore: $('final-score'),
    finalTime: $('final-time'),
    finalBest: $('final-best'),
    newBest: $('new-best')
  };

  function svgIcon(name, group) {
    var g = group ? ICONS[group] : null;
    var d = (g && g[name]) || ICONS.ui[name] || ICONS.animal[name] || ICONS.object[name];
    if (!d) return '';
    return '<svg viewBox="0 0 ' + d[0] + ' ' + d[1] + '" aria-hidden="true"><path d="' + d[2] + '"/></svg>';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-icon]'), function (n) {
    n.innerHTML = svgIcon(n.getAttribute('data-icon'), 'ui');
  });

  // ---------- state ----------
  var state = {
    category: null,
    list: null,
    score: 0,
    elapsed: 0,          // ms
    lastTick: 0,
    running: false,      // timer running
    playing: false,      // inside a round
    killCountTrack: 1,
    timerId: null,
    spawnTimeout: null
  };

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s -= m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateBestLine() {
    el.bestLine.hidden = best <= 0;
    el.bestStart.textContent = best;
  }
  updateBestLine();

  // ---------- timer ----------
  function tick() {
    if (!state.running) return;
    var now = performance.now();
    state.elapsed += now - state.lastTick;
    state.lastTick = now;
    el.time.textContent = fmtTime(state.elapsed);
  }
  function startTimer() {
    if (state.running) return;
    state.running = true;
    state.lastTick = performance.now();
    clearInterval(state.timerId);
    state.timerId = setInterval(tick, 250);
  }
  function stopTimer() {
    tick();
    state.running = false;
    clearInterval(state.timerId);
  }

  // ---------- symbol size & positions ----------
  function symSize() {
    var w = el.field.clientWidth, h = el.field.clientHeight;
    var s = Math.round(Math.min(w, h) * 0.085);
    return Math.max(34, Math.min(64, s));
  }
  function applySymSize() {
    document.documentElement.style.setProperty('--sym', symSize() + 'px');
  }
  applySymSize();
  window.addEventListener('resize', function () {
    applySymSize();
    // keep existing symbols inside the field after a resize/rotation
    var w = el.field.clientWidth, h = el.field.clientHeight;
    Array.prototype.forEach.call(el.field.children, function (o) {
      if (o.dataset.fx) {
        o.style.left = (parseFloat(o.dataset.fx) * w) + 'px';
        o.style.top = (parseFloat(o.dataset.fy) * h) + 'px';
      }
    });
    clampAll();
  });

  function getRandomPosition() {
    var w = el.field.clientWidth, h = el.field.clientHeight;
    var half = symSize() / 2 + 8;
    var top = 56 + half;                         // keep clear of the HUD
    var x = half + Math.random() * Math.max(1, w - half * 2);
    var y = top + Math.random() * Math.max(1, h - top - half);
    return [x, y];
  }
  function clampAll() {
    var w = el.field.clientWidth, h = el.field.clientHeight;
    var half = symSize() / 2 + 8;
    Array.prototype.forEach.call(el.field.children, function (o) {
      var x = Math.min(Math.max(parseFloat(o.style.left), half), w - half);
      var y = Math.min(Math.max(parseFloat(o.style.top), 56 + half), h - half);
      o.style.left = x + 'px';
      o.style.top = y + 'px';
    });
  }

  // ---------- objects ----------
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function createObject() {
    if (!state.playing) return;
    var item = pick(state.list);
    var pos = getRandomPosition();
    var div = document.createElement('div');
    div.className = 'game-object';
    var sym = document.createElement('div');
    sym.className = 'sym';
    if (state.category === 'animal' || state.category === 'object') sym.innerHTML = svgIcon(item, state.category);
    else sym.textContent = item;
    sym.style.color = pick(data.colors);
    sym.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
    div.appendChild(sym);
    div.style.left = pos[0] + 'px';
    div.style.top = pos[1] + 'px';
    div.dataset.fx = pos[0] / el.field.clientWidth;
    div.dataset.fy = pos[1] / el.field.clientHeight;
    el.field.appendChild(div);
  }

  function deleteObject(o) {
    o.classList.add('hide-object');
    o.dataset.dead = '1';
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 300);
  }

  function popText(x, y) {
    var p = document.createElement('div');
    p.className = 'pop';
    p.textContent = '+1';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    el.field.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 600);
  }

  function kill(o) {
    deleteObject(o);
    popText(parseFloat(o.style.left), parseFloat(o.style.top) - symSize() / 2);
    el.hint.classList.remove('show');

    var score = ++state.score;
    el.score.textContent = score;
    var killCountTrack = ++state.killCountTrack;

    // each click spawns a growing burst of new symbols, then the flood pauses
    if (killCountTrack > 0) {
      for (var i = 0; i < killCountTrack; i++) createObject();
    }
    if (killCountTrack + 1 > 10) state.killCountTrack = -44;

    // safety net: never leave the board empty
    if (!el.field.querySelector('.game-object:not([data-dead])')) createObject();

    if (score % 50 === 0) showCheckpoint(score);
  }

  el.field.addEventListener('pointerdown', function (e) {
    if (!state.playing || !state.running) return;
    var o = e.target.closest ? e.target.closest('.game-object') : null;
    if (!o || o.dataset.dead) return;
    e.preventDefault();
    kill(o);
  });

  // ---------- flow ----------
  function clearField() {
    clearTimeout(state.spawnTimeout);
    el.field.innerHTML = '';
  }

  function startGame() {
    clearField();
    el.message.hidden = true;
    el.results.hidden = true;
    el.paused.hidden = true;
    state.score = 0;
    state.elapsed = 0;
    state.killCountTrack = 1;
    state.playing = true;
    el.score.textContent = '0';
    el.time.textContent = '00:00';
    applySymSize();
    startTimer();
    el.hint.classList.add('show');
    state.spawnTimeout = setTimeout(createObject, 650);
  }

  function selectOne(cat) {
    state.category = cat;
    state.list = data[cat];
    el.optionScreen.classList.add('up-screen');
    startGame();
  }

  function showCheckpoint(score) {
    stopTimer();
    el.checkpointScore.textContent = score;
    el.message.hidden = false;
  }

  function endGame() {
    if (!state.playing) return;
    stopTimer();
    state.playing = false;
    clearTimeout(state.spawnTimeout);
    el.message.hidden = true;
    el.paused.hidden = true;
    el.hint.classList.remove('show');
    var isBest = state.score > best;
    if (isBest) { best = state.score; save(KEY_BEST, best); }
    el.finalScore.textContent = state.score;
    el.finalTime.textContent = fmtTime(state.elapsed);
    el.finalBest.textContent = best;
    el.newBest.hidden = !isBest;
    el.results.hidden = false;
    updateBestLine();
  }

  function backToMenu() {
    clearField();
    el.results.hidden = true;
    el.optionScreen.classList.remove('up-screen');
    el.startScreen.classList.remove('up-screen');
  }

  // ---------- pause when the page is hidden ----------
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.playing && state.running) {
      stopTimer();
      el.paused.hidden = false;
    }
  });

  // ---------- buttons ----------
  function onTap(id, fn) {
    $(id).addEventListener('click', fn);
  }
  onTap('play-btn', function () { el.startScreen.classList.add('up-screen'); });
  onTap('back-btn', function () { el.startScreen.classList.remove('up-screen'); });
  Array.prototype.forEach.call(document.querySelectorAll('.option'), function (b) {
    b.addEventListener('click', function () { selectOne(b.getAttribute('data-cat')); });
  });
  onTap('no-btn', function () { el.message.hidden = true; startTimer(); });
  onTap('yes-btn', endGame);
  onTap('end-btn', endGame);
  onTap('again-btn', startGame);
  onTap('menu-btn', backToMenu);
  onTap('resume-btn', function () { el.paused.hidden = true; startTimer(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.playing) {
      if (!el.paused.hidden) { el.paused.hidden = true; startTimer(); }
      else if (el.message.hidden) { stopTimer(); el.paused.hidden = false; }
    }
  });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();
