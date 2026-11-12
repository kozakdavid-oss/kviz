/* kozos.js – Kisori, a tanuló oroszlán: pontok, napi sorozat, jelvények, szintek, felolvasás */
(function () {
'use strict';
var KEY = 'kviz_adatok_v1', NAME = 'Kisori', IMG = 'kisori.png';
var CAP_FROM = 30, CAP = 20;   // 30 kérdésnél hosszabb feladatsorból egy körben csak CAP kérdés jön

var LEVELS = [
  { n: 'Oroszlánkölyök', min: 0 }, { n: 'Kis tanonc', min: 100 }, { n: 'Okos oroszlán', min: 300 },
  { n: 'Bajnok', min: 700 }, { n: 'Oroszlánkirály', min: 1500 }
];
var BADGES = [
  { id: 'elso', e: '🌟', n: 'Első kvíz', d: 'Kitöltöttél egy kvízt', ok: function (s) { return s.done >= 1; } },
  { id: 'tokeletes', e: '💯', n: 'Hibátlan', d: 'Egy kvízt 100%-ra töltöttél ki', ok: function (s) { return s.perfect >= 1; } },
  { id: 's3', e: '🔥', n: '3 napos sorozat', d: '3 napon át gyakoroltál egymás után', ok: function (s) { return s.longest >= 3; } },
  { id: 's7', e: '🔥🔥', n: '7 napos sorozat', d: '7 napon át gyakoroltál egymás után', ok: function (s) { return s.longest >= 7; } },
  { id: 's14', e: '🏆', n: '14 napos sorozat', d: '14 napon át gyakoroltál egymás után', ok: function (s) { return s.longest >= 14; } },
  { id: 'k10', e: '📚', n: '10 kvíz', d: '10 kvízt kitöltöttél', ok: function (s) { return s.done >= 10; } },
  { id: 'k50', e: '🎓', n: '50 kvíz', d: '50 kvízt kitöltöttél', ok: function (s) { return s.done >= 50; } },
  { id: 'kartya3', e: '🃏', n: 'Kártyamester', d: '3 kártyapaklit végigcsináltál', ok: function (s) { return s.deckCount >= 3; } },
  { id: 'felfedezo', e: '🌍', n: 'Felfedező', d: '5 különböző tantárgyból gyakoroltál', ok: function (s) { return s.subjects.length >= 5; } },
  { id: 'p500', e: '🥈', n: '500 pont', d: 'Összegyűjtöttél 500 pontot', ok: function (s) { return s.points >= 500; } },
  { id: 'p1500', e: '🥇', n: '1500 pont', d: 'Összegyűjtöttél 1500 pontot', ok: function (s) { return s.points >= 1500; } }
];
var OK_MSG = ['Ügyes vagy! 🎉', 'Szuper! 🌟', 'Így tovább! 💪', 'Zseniális! 🦁', 'Tökéletes!', 'Nagyszerű! ✨'];
var KO_MSG = ['Semmi baj, majd megjegyzed! 💪', 'Nézd meg a helyes választ! 👀', 'Legközelebb sikerül! 🍀', 'Hibázni szabad, így tanulunk! 😊'];

/* ---------- állapot ---------- */
var mem = null;
function def() { return { points: 0, streak: 0, longest: 0, lastDay: '', quizzes: {}, decks: {}, badges: [], subjects: [], perfect: 0, done: 0, deckCount: 0 }; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return dstr(new Date()); }
function yesterday() { var d = new Date(); d.setDate(d.getDate() - 1); return dstr(d); }
function load() {
  try { var t = localStorage.getItem(KEY); if (t) { var o = JSON.parse(t), b = def(); for (var k in o) b[k] = o[k]; mem = b; return b; } } catch (e) {}
  return mem || (mem = def());
}
function save(s) { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
function curStreak(s) { return (s.lastDay === today() || s.lastDay === yesterday()) ? s.streak : 0; }
function touchDay(s) {
  var t = today(); if (s.lastDay === t) return false;
  s.streak = (s.lastDay === yesterday()) ? s.streak + 1 : 1;
  if (s.streak > s.longest) s.longest = s.streak;
  s.lastDay = t; return true;
}
function level(p) {
  var i = 0, k; for (k = 0; k < LEVELS.length; k++) if (p >= LEVELS[k].min) i = k;
  var cur = LEVELS[i], nx = LEVELS[i + 1];
  return { i: i, name: cur.n, next: nx ? nx.min : null, pct: nx ? Math.round((p - cur.min) / (nx.min - cur.min) * 100) : 100 };
}
function subjectOf(id) { var m = /^(tortenelem|kornyezet|irodalom|matek|enek|nyelvtan|angol)_/.exec(id); return m ? m[1] : 'angol'; }
function starsFor(p) { return p >= 90 ? 3 : p >= 70 ? 2 : p >= 50 ? 1 : 0; }
function conclude(s, pts) {
  var before = level(s.points).i, nb = [];
  s.points += pts;
  BADGES.forEach(function (b) { if (s.badges.indexOf(b.id) < 0 && b.ok(s)) { s.badges.push(b.id); nb.push(b); } });
  save(s);
  var lv = level(s.points);
  return { newBadges: nb, levelUp: lv.i > before, level: lv, points: s.points, streak: s.streak };
}
function completeQuiz(id, correct, total) {
  var s = load(), pct = total ? Math.round(correct / total * 100) : 0, st = starsFor(pct);
  var pts = correct * 10 + ((pct === 100 && total > 0) ? 30 : 0);
  var q = s.quizzes[id] || { times: 0, best: 0, bestPct: 0 };
  q.times++; if (st > q.best) q.best = st; if (pct > q.bestPct) q.bestPct = pct; s.quizzes[id] = q;
  s.done++; if (pct === 100 && total > 0) s.perfect++;
  var sub = subjectOf(id); if (s.subjects.indexOf(sub) < 0) s.subjects.push(sub);
  var newDay = touchDay(s), r = conclude(s, pts);
  r.pct = pct; r.stars = st; r.pts = pts; r.newDay = newDay; return r;
}
function completeDeck(id) {
  var s = load(), t = today(), pts = 0;
  if (s.decks[id] !== t) { pts = 20; s.decks[id] = t; s.deckCount++; }
  var newDay = touchDay(s), r = conclude(s, pts);
  r.pts = pts; r.newDay = newDay; return r;
}

/* ---------- felolvasás ---------- */
function canSpeak() { return ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window); }
function speak(text, lang) {
  if (!canSpeak() || !text) return;
  try {
    var ss = window.speechSynthesis, want = lang || 'en-GB'; ss.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = want; u.rate = 0.85;
    var vs = ss.getVoices() || [], i, pick = null;
    for (i = 0; i < vs.length; i++) { if ((vs[i].lang || '').replace('_', '-') === want) { pick = vs[i]; break; } }
    if (!pick) for (i = 0; i < vs.length; i++) { if ((vs[i].lang || '').toLowerCase().indexOf(want.slice(0, 2).toLowerCase()) === 0) { pick = vs[i]; break; } }
    if (pick) u.voice = pick;
    ss.speak(u);
  } catch (e) {}
}
function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

/* ---------- stílus (főoldal + játékoldali keret) ---------- */
var LIONCSS = '.kz-l{display:inline-block;position:relative;line-height:0;transform-origin:50% 100%}' +
  '.kz-bd{display:block;position:relative;transform-origin:50% 100%;animation:kz-breathe 3.4s ease-in-out infinite}' +
  '.kz-l img{display:block;height:auto;max-width:none}.kz-s{font-size:78px}.kz-m{font-size:122px}.kz-lg{font-size:136px}.kz-xl{font-size:156px}.kz-s img{width:78px}.kz-m img{width:122px}.kz-lg img{width:136px}.kz-xl img{width:156px}' +
  '.kz-nopic img,.kz-nopic .kz-eye{display:none}.kz-nopic:before{content:"🦁";display:block;line-height:1.1;font-size:54px;text-align:center}.kz-s .kz-nopic:before{font-size:40px}.kz-lg .kz-nopic:before,.kz-xl .kz-nopic:before{font-size:84px}' +
  '.kz-eye{position:absolute;background:#dec638;border-bottom:.014em solid rgba(120,95,10,.8);border-radius:50%;transform:scaleY(0);transform-origin:50% 0;animation:kz-blink 4.6s infinite}' +
  '@keyframes kz-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.03)}}' +
  '@keyframes kz-blink{0%,90%,100%{transform:scaleY(0)}93%,96%{transform:scaleY(1)}}' +
  '@keyframes kz-hop{0%{transform:translateY(0) scale(1,1)}18%{transform:translateY(0) scale(1.1,.88)}42%{transform:translateY(-26%) scale(.94,1.1)}68%{transform:translateY(0) scale(1.08,.92)}84%{transform:translateY(-8%) scale(.98,1.03)}100%{transform:translateY(0) scale(1,1)}}' +
  '.kz-hop{animation:kz-hop .75s ease-out}' +
  '@keyframes kz-shake{0%,100%{transform:rotate(0)}15%{transform:rotate(-7deg) translateX(-3%)}35%{transform:rotate(6deg) translateX(3%)}55%{transform:rotate(-4deg) translateX(-2%)}75%{transform:rotate(3deg)}}' +
  '.kz-shake{animation:kz-shake .7s ease-in-out}' +
  '@keyframes kz-cheer{0%{transform:translateY(0)}15%{transform:translateY(0) scale(1.12,.86)}35%{transform:translateY(-34%) scale(.92,1.14)}55%{transform:translateY(0) scale(1.1,.9)}70%{transform:translateY(-22%) scale(.96,1.08)}85%{transform:translateY(0) scale(1.05,.95)}100%{transform:translateY(0)}}' +
  '.kz-cheer{animation:kz-cheer 1.2s ease-out}' +
  '@keyframes kz-spin{0%{transform:translateY(0) rotate(0)}40%{transform:translateY(-36%) rotate(200deg) scale(1.1)}100%{transform:translateY(0) rotate(360deg)}}' +
  '.kz-spin{animation:kz-spin 1.1s ease-in-out}' +
  '.kz-sp{position:absolute;bottom:45%;font-size:18px;line-height:1;pointer-events:none;opacity:0;animation:kz-sp 1.4s ease-out forwards}' +
  '@keyframes kz-sp{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-90px) scale(1.2)}}' +
  '@media (prefers-reduced-motion:reduce){.kz-bd,.kz-eye{animation:none}.kz-l{animation:none!important}.kz-sp{display:none}}';
function css() {
  return '.kz-dash{width:100%;max-width:520px;margin:0 auto 1.6rem;background:#fff;border-radius:24px;padding:14px 14px 12px;box-shadow:0 8px 30px rgba(60,40,120,.14);font-family:inherit;box-sizing:border-box}' +
  '.kz-top{display:flex;align-items:center;gap:10px}.kz-top .kz-l{flex-shrink:0}' +
  '@keyframes kzbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
  '.kz-say{background:#fffbeb;border:2px solid #fde68a;border-radius:16px;padding:10px 12px;font-size:14px;font-weight:700;color:#78350f;line-height:1.4}' +
  '.kz-stats{display:flex;gap:8px;margin-top:12px}.kz-stat{flex:1;background:#f5f3ff;border-radius:14px;padding:8px 4px;text-align:center}' +
  '.kz-stat b{display:block;font-size:16px;color:#1a1040}.kz-stat span{font-size:11px;color:#7a6f9a;font-weight:700}' +
  '.kz-bar{height:10px;background:#ede9fe;border-radius:99px;overflow:hidden;margin-top:10px}.kz-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:99px}' +
  '.kz-small{font-size:11px;color:#7a6f9a;font-weight:700;margin-top:4px}' +
  '.kz-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.kz-b{border:none;background:#fef3c7;border-radius:12px;padding:5px 8px;font-size:18px;cursor:pointer}.kz-b.off{filter:grayscale(1);opacity:.35}' +
  '.kz-binfo{font-size:12px;font-weight:700;color:#4c1d95;min-height:16px;margin-top:6px}' +
  '.kz-card{cursor:pointer}.kz-stars{margin-top:8px;font-size:15px;color:#f59e0b;letter-spacing:1px}.kz-stars small{color:#7a6f9a;font-size:11px;letter-spacing:0}' +
  '.kz-actions{display:flex;gap:8px;margin-top:10px;width:100%}.kz-btn{flex:1;text-decoration:none;text-align:center;border-radius:12px;padding:9px 4px;font-size:13px;font-weight:800}' +
  '.kz-q{background:#ede9fe;color:#5b21b6}.kz-c{background:#fef3c7;color:#92400e}' +
  '.kz-panel{background:#fff;border-radius:24px;box-shadow:0 8px 30px rgba(60,40,120,.14);padding:14px;margin-bottom:1rem;text-align:center;font-family:inherit}' +
  '.kz-big{font-size:34px;letter-spacing:4px}' +
  '.kz-pts{font-size:26px;font-weight:900;color:#d97706}.kz-line{font-size:14px;font-weight:700;color:#4c1d95;margin-top:4px}' +
  '.kz-new{margin-top:8px;background:#ecfdf5;border:2px solid #6ee7b7;border-radius:14px;padding:8px;font-size:14px;font-weight:800;color:#047857}' +
  '.kz-msg{margin-top:8px;background:#fffbeb;border:2px solid #fde68a;border-radius:14px;padding:8px 10px;font-size:14px;font-weight:700;color:#78350f}' +
  '.kz-spk{border:none;background:#e0f2fe;color:#0369a1;border-radius:12px;padding:6px 12px;font-size:16px;cursor:pointer;margin-left:8px;vertical-align:middle}' + LIONCSS;
}
function injectCSS(doc) {
  doc = doc || document; if (doc.getElementById('kz-css')) return;
  var st = doc.createElement('style'); st.id = 'kz-css'; st.appendChild(doc.createTextNode(css())); doc.head.appendChild(st);
}


/* ---------- Kisori: megjelenítés és mozgás ---------- */
var EYES = '<i class="kz-eye" style="left:46.70%;top:30.18%;width:5.09%;height:5.79%"></i><i class="kz-eye r" style="left:49.96%;top:29.15%;width:5.09%;height:5.27%"></i>';
var BOOP = ['Hihi, csiklandozol! 😄', 'Gyerünk, gyakoroljunk! 🦁', 'Ugye milyen puha vagyok? 🧸', 'Rrrr! Készen állok! 💪', 'Válassz egy tantárgyat! 📚'];
function lionHTML(cls) {
  var dl = '-' + (Math.random() * 4).toFixed(2) + 's';
  return '<span class="kz-l ' + (cls || 'kz-m') + '"><span class="kz-bd"><img src="' + IMG + '" alt="" onerror="this.parentNode.className+=\' kz-nopic\'">' + EYES.replace(/<i /g, '<i style="animation-delay:' + dl + '" data-x="1" ').replace(/style="animation-delay:([^"]*)" data-x="1" class="([^"]*)" style="([^"]*)"/g, 'class="$2" style="animation-delay:$1;$3"') + '</span></span>';
}
function sparkle(el) {
  var d = el.ownerDocument, em = ['✨', '⭐', '🌟', '💫'], i;
  for (i = 0; i < 7; i++) {
    var sp = d.createElement('span'); sp.className = 'kz-sp'; sp.textContent = em[i % em.length];
    sp.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); sp.style.left = (15 + Math.random() * 70) + '%'; sp.style.animationDelay = (i * 60) + 'ms';
    el.appendChild(sp); (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 1800); })(sp);
  }
}
function react_(el, type) {
  if (!el) return;
  var map = { hop: 'kz-hop', shake: 'kz-shake', cheer: 'kz-cheer', spin: 'kz-spin' }, c = map[type] || 'kz-hop', k;
  for (k in map) el.classList.remove(map[k]);
  void el.offsetWidth; el.classList.add(c);
  var done = function (e) { if (e && e.target !== el) return; el.classList.remove(c); el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
  if (type === 'cheer' || type === 'spin') sparkle(el);
}

/* ---------- főoldal ---------- */
function greeting(s) {
  var st = curStreak(s);
  if (s.lastDay === today()) return 'Ma már gyakoroltál, szuper vagy! 🌟 Folytatod?';
  if (st > 0) return 'Gyere, folytasd a sorozatot! 🔥 Már ' + st + ' napja gyakorolsz egymás után!';
  if (s.done > 0) return 'Újra itt vagy, de jó! 🦁 Gyakoroljunk ma is!';
  return 'Szia! Én ' + NAME + ' vagyok, a tanuló oroszlán. Gyakoroljunk együtt! 🦁';
}
function renderDash(el) {
  if (!el) return; var s = load(), lv = level(s.points);
  var html = '<div class="kz-dash"><div class="kz-top">' + lionHTML('kz-m') + '<div class="kz-say"><b>' + NAME + ':</b> ' + esc(greeting(s)) + '</div></div>' +
    '<div class="kz-stats"><div class="kz-stat"><b>⭐ ' + s.points + '</b><span>pont</span></div><div class="kz-stat"><b>🔥 ' + curStreak(s) + '</b><span>napos sorozat</span></div>' +
    '<div class="kz-stat"><b>🦁 ' + esc(lv.name) + '</b><span>szint</span></div></div>' +
    '<div class="kz-bar"><i style="width:' + lv.pct + '%"></i></div>' +
    '<div class="kz-small">' + (lv.next ? 'Még ' + (lv.next - s.points) + ' pont a következő szintig' : 'Elérted a legmagasabb szintet! 👑') + '</div><div class="kz-badges">';
  BADGES.forEach(function (b, i) { html += '<button class="kz-b' + (s.badges.indexOf(b.id) < 0 ? ' off' : '') + '" data-i="' + i + '">' + b.e + '</button>'; });
  html += '</div><div class="kz-binfo" id="kzBinfo">Koppints egy jelvényre!</div></div>';
  el.innerHTML = html;
  var lion = el.querySelector('.kz-l'), say = el.querySelector('.kz-say');
  if (lion) { lion.style.cursor = 'pointer'; lion.addEventListener('click', function () { react_(lion, 'hop'); if (say) say.innerHTML = '<b>' + NAME + ':</b> ' + esc(rnd(BOOP)); }); }
  var info = el.querySelector('#kzBinfo');
  Array.prototype.forEach.call(el.querySelectorAll('.kz-b'), function (b) {
    b.addEventListener('click', function () {
      var bd = BADGES[+b.getAttribute('data-i')], got = s.badges.indexOf(bd.id) >= 0;
      info.textContent = (got ? '✅ ' : '🔒 ') + bd.n + ' – ' + bd.d;
    });
  });
}
function starsText(q) { var b = q && q.best ? q.best : 0, t = '', i; for (i = 0; i < 3; i++) t += i < b ? '⭐' : '☆'; return t + (q ? ' <small>' + q.bestPct + '%</small>' : ''); }
function decorateCards() {
  var s = load();
  Array.prototype.slice.call(document.querySelectorAll('a.card')).forEach(function (a) {
    var id = (a.getAttribute('href') || '').replace(/\.html$/, ''); if (!/^[a-z0-9_]+$/.test(id)) return;
    var d = document.createElement('div'); d.className = 'card kz-card'; d.setAttribute('data-id', id);
    var stl = a.getAttribute('style'); if (stl) d.setAttribute('style', stl);
    d.innerHTML = a.innerHTML + '<div class="kz-stars" title="Legjobb eredmény">' + starsText(s.quizzes[id]) + '</div>' +
      '<div class="kz-actions"><a class="kz-btn kz-q" href="jatek.html?f=' + id + '">📝 Kvíz</a><a class="kz-btn kz-c" href="kartyak.html?f=' + id + '">🃏 Kártyák</a></div>';
    d.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) return; location.href = 'jatek.html?f=' + id; });
    a.parentNode.replaceChild(d, a);
  });
}
function refreshHome() {
  var s = load(); renderDash(document.getElementById('kz-dash'));
  Array.prototype.forEach.call(document.querySelectorAll('.kz-card'), function (c) {
    var st = c.querySelector('.kz-stars'); if (st) st.innerHTML = starsText(s.quizzes[c.getAttribute('data-id')]);
  });
}
function initHome() {
  injectCSS(); renderDash(document.getElementById('kz-dash')); decorateCards();
  window.addEventListener('pageshow', function (e) { if (e.persisted) refreshHome(); });
}

/* ---------- játékoldal (a kvíz egy keretben fut, ezt „figyeljük”) ---------- */
function num(d, a, b) { var e = d.getElementById(a) || d.getElementById(b); return e ? (parseInt(e.textContent, 10) || 0) : 0; }
function hook(fr, id, say, mreact) {
  var w = fr.contentWindow, d = fr.contentDocument; if (!w || !d) return;
  document.title = d.title || document.title;
  var base = d.createElement('base'); base.target = '_top'; d.head.insertBefore(base, d.head.firstChild);
  injectCSS(d);
  var english = false; try { english = !!w.eval("typeof WORDS!=='undefined'"); } catch (e) {}

  function curWord() { try { return JSON.parse(w.eval('JSON.stringify(order[idx])')); } catch (e) { return null; } }
  function wordText(x) {
    if (!x) return ''; var en = x.en || [];
    if (/\+\s*\?$/.test(x.hu || '') && en[1]) return en[1];
    return en[0] || '';
  }
  function updateSpeaker(el, state) {
    if (!english || !canSpeak()) return;
    var par = el.parentNode, old = par.querySelector('.kz-spk');
    if (!state) { if (old) par.removeChild(old); return; }
    if (old) return;
    var b = d.createElement('button'); b.type = 'button'; b.className = 'kz-spk'; b.textContent = '🔊'; b.title = 'Hallgasd meg!';
    b.onclick = function () { speak(wordText(curWord())); };
    par.appendChild(b);
  }
  ['feedback', 'fb'].forEach(function (fid) {
    var el = d.getElementById(fid); if (!el) return; var last = '';
    var mo = new w.MutationObserver(function () {
      var c = el.className, st = /fb-ok/.test(c) ? 'ok' : (/fb-ko/.test(c) ? 'ko' : '');
      if (st === last) return; last = st;
      if (st === 'ok') { say(rnd(OK_MSG)); mreact('hop'); } else if (st === 'ko') { say(rnd(KO_MSG)); mreact('shake'); }
      updateSpeaker(el, st);
    });
    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  function onResult() {
    var c = num(d, 'resCnt', 'rG'), x = num(d, 'resWrong', 'rR'), total = c + x;
    var res = completeQuiz(id, c, total);
    var box = d.getElementById('scResult') || d.getElementById('scRes');
    if (box && !box.querySelector('.kz-panel')) {
      var stars = '', i; for (i = 0; i < 3; i++) stars += i < res.stars ? '⭐' : '☆';
      var msg = res.pct === 100 ? 'Hibátlan! Büszke vagyok rád! 💯' : res.pct >= 80 ? 'Nagyon ügyes vagy! 🎉' : res.pct >= 50 ? 'Jó munka! Még egy kör, és még jobb lesz! 💪' : 'Semmi baj, gyakorolj még, menni fog! 🍀';
      var h = '<div class="kz-panel">' + lionHTML('kz-lg') + '<div class="kz-big">' + stars + '</div><div class="kz-pts">+' + res.pts + ' pont</div>' +
        '<div class="kz-line">🔥 ' + res.streak + ' napos sorozat · ⭐ ' + res.points + ' pont összesen</div>';
      if (res.levelUp) h += '<div class="kz-new">🦁 Új szint: ' + esc(res.level.name) + '!</div>';
      res.newBadges.forEach(function (b) { h += '<div class="kz-new">🏅 Új jelvény: ' + b.e + ' ' + esc(b.n) + '</div>'; });
      h += '<div class="kz-msg"><b>' + NAME + ':</b> ' + msg + '</div></div>';
      var tmp = d.createElement('div'); tmp.innerHTML = h; box.insertBefore(tmp.firstChild, box.firstChild);
      react_(box.querySelector('.kz-panel .kz-l'), res.levelUp ? 'spin' : (res.pct >= 50 ? 'cheer' : 'hop'));
    }
    if (english && canSpeak()) {
      Array.prototype.forEach.call(d.querySelectorAll('.word-row'), function (r) {
        if (r.querySelector('.kz-spk')) return;
        var cw = r.querySelector('.wr-correct'), t = cw ? cw.textContent.replace(/^[→\s]+/, '') : ((r.querySelector('.wr-typed') || {}).textContent || '');
        if (!t) return; var b = d.createElement('button'); b.type = 'button'; b.className = 'kz-spk'; b.textContent = '🔊';
        b.onclick = function () { speak(t); }; r.appendChild(b);
      });
    }
    mreact(res.levelUp ? 'spin' : 'cheer');
    say(res.levelUp ? 'Szintet léptél! 🦁🎉' : (res.pct >= 80 ? 'Szuper eredmény! 🌟' : 'Ügyes voltál! 💪'), 4000);
  }

  /* hosszú feladatsor: egy körben csak CAP kérdés jön, minden körben mások */
  try {
    if (w.eval("typeof QUESTIONS!=='undefined'&&typeof start==='function'")) {
      var os = w.start;
      w.start = function () {
        var r = os.apply(this, arguments);
        try {
          var n = w.eval('QUESTIONS.length');
          if (n > CAP_FROM) { w.eval('order.length=' + CAP + ';render();'); say('Most ' + CAP + ' kérdés jön a(z) ' + n + '-ből, minden körben mások! 🦁', 4200); }
        } catch (e) {}
        return r;
      };
    }
  } catch (e) {}
  ['showResult', 'finish'].forEach(function (n) {
    var o = w[n]; if (typeof o !== 'function') return;
    w[n] = function () { var r = o.apply(this, arguments); try { onResult(); } catch (e) {} return r; };
  });
}
function initPlay() {
  injectCSS();
  var id = new URLSearchParams(location.search).get('f') || '';
  if (!/^[a-z0-9_]+$/.test(id)) { document.body.innerHTML = '<p style="font:16px sans-serif;padding:20px">Hibás hivatkozás. <a href="gyakorlas.html">Vissza a főoldalra</a></p>'; return; }
  var fr = document.getElementById('kzFrame'), bub = document.getElementById('kzBubble'), t;
  var slot = document.getElementById('kzLion'); if (slot) slot.innerHTML = lionHTML('kz-s');
  function mreact(ty) { react_(document.querySelector('#kzMascot .kz-l'), ty); }
  function say(txt, ms) { bub.textContent = txt; bub.classList.add('on'); clearTimeout(t); t = setTimeout(function () { bub.classList.remove('on'); }, ms || 2600); }
  fr.addEventListener('load', function () { try { hook(fr, id, say, mreact); } catch (e) {} });
  fr.src = id + '.html';
  say('Szia! Én ' + NAME + ' vagyok. Sok sikert! 🦁', 3200);
}

window.KZ = {
  CAP_FROM: CAP_FROM, CAP: CAP,
  lionHTML: lionHTML, react: react_,
  NAME: NAME, IMG: IMG, load: load, save: save, today: today, level: level, badges: BADGES, curStreak: curStreak,
  completeQuiz: completeQuiz, completeDeck: completeDeck, speak: speak, canSpeak: canSpeak,
  injectCSS: injectCSS, initHome: initHome, initPlay: initPlay, rnd: rnd, okMsgs: OK_MSG, koMsgs: KO_MSG, esc: esc
};
})();
