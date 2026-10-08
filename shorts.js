/* 핏 테스트 앱 — 전체 화면(쇼츠형): 캐릭터를 배경에 두고 메뉴를 시트 레이어로 띄운다. app.js 와 같은 저장 형식을 공유한다. 계산은 fit-engine.js, 기준값은 fit-config.js 에 있다.
   서버 전송 없음. 텍스트 데이터는 localStorage, 아바타 이미지·영상은 IndexedDB 에만 저장한다. */
(function () {
  'use strict';

  var KEY = 'fit-test-v1';                 /* 프로필별 데이터는 KEY + ':' + 사용자 id. KEY 단독은 로그인 도입 전 데이터 */
  var USERS_KEY = 'fit-users-v1', CUR_KEY = 'fit-current-user';
  var STEPS = ['profile', 'top', 'bottom', 'shoe', 'confirm', 'result'];
  var STEP_NAMES = { profile: '내 정보', top: '상의', bottom: '하의', shoe: '신발', confirm: '확인', result: '결과' };
  var CATS = { top: '상의', bottom: '하의', shoe: '신발' };
  var MOTIONS = ['정면 서기', '한 바퀴', '걷기'];
  var PREFS = [['tight', '타이트'], ['fit', '정핏'], ['loose', '여유'], ['over', '오버핏']];
  var FIELDS = {
    top: [['chest', '가슴단면'], ['shoulder', '어깨'], ['length', '총장'], ['sleeve', '소매']],
    bottom: [['waist', '허리단면'], ['hip', '엉덩이단면'], ['thigh', '허벅지단면'], ['rise', '밑위'], ['inseam', '기장(인심)']],
    shoe: [['inner', '안쪽 길이(mm)']]
  };
  var MFIELDS = [
    ['chest', '가슴둘레', 'cm'], ['shoulder', '어깨너비', 'cm'], ['waist', '허리둘레', 'cm'], ['hip', '엉덩이둘레', 'cm'],
    ['thigh', '허벅지둘레', 'cm'], ['arm', '팔길이(어깨점~손목)', 'cm'], ['inseam', '다리 안쪽 길이(인심)', 'cm'],
    ['rise', '밑위(앞)', 'cm'], ['foot', '발길이', 'mm']
  ];
  var BASE_CFG = JSON.parse(JSON.stringify(window.FIT_CONFIG));
  var E = window.FitEngine;

  var LOGO = '<svg viewBox="0 0 34 34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12v-1.5a3 3 0 1 0-3-3"/><path d="M17 12L3.5 22.5Q2 24 4 24.5H30Q32 24 30.5 22.5Z"/></svg>';
  var HERO_BANNER = '<div class="hero"><div class="tx"><span class="pill">FIT CHECK</span><h2>입기 전에,<br>내 사이즈로 먼저 입어보세요</h2><p>쇼핑몰에서 고른 상의, 하의, 신발이 내 몸에 맞는지 실측표로 확인해 드려요.</p></div>' +
    '<svg viewBox="0 0 120 130" aria-hidden="true"><path d="M44 18Q60 30 76 18L98 28L112 52L94 60L90 52V112H30V52L26 60L8 52L22 28Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M44 18Q60 30 76 18" fill="none" stroke="var(--ink)" stroke-width="2"/>' +
    '<g stroke="var(--accent)" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M30 76H90" stroke-dasharray="4 3"/><path d="M30 70v12M90 70v12"/></g>' +
    '<g transform="translate(78 92) rotate(8)"><rect width="30" height="20" rx="4" fill="var(--accent)"/><text x="15" y="14.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="sans-serif">M</text></g></svg></div>';
  var HERO = '<div class="herovid"><video src="assets/hero_v4_5cut.mp4" autoplay muted loop playsinline preload="auto" aria-label="FIT 홍보 영상" onerror="this.parentNode.classList.add(&#39;novid&#39;)"></video>' +
    '<div class="hv-cap">FIT 하면 이렇게 보여요</div><div class="hv-ai">AI 생성 이미지</div>' + HERO_BANNER + '</div>';

  /* ---------- 상태 ---------- */
  function blankState() {
    return { step: 'profile', profile: { gender: 'male', height: '', weight: '', pref: 'fit', m: {} },
      closet: [], sel: {}, draft: null, motion: 0, cfg: null, feel: {}, seq: 1 };
  }
  /* ---------- 프로필(이 기기 안 로그인) ---------- */
  function readUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; } }
  function writeUsers(list) { try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) { /* 저장 불가 */ } }
  function userById(id) { return readUsers().filter(function (u) { return u.id === id; })[0] || null; }
  /* 같은 기기를 쓰는 사람끼리 구분하는 잠금용. http(192.168…)에서도 돌아가도록 crypto.subtle 없이 계산한다 */
  function pinHash(salt, pin) {
    var s = salt + ':' + pin, a = 0x811c9dc5, b = 5381;
    for (var r = 0; r < 2000; r++) {
      for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) + c) >>> 0; }
      s = a.toString(36) + b.toString(36) + salt;
    }
    return s;
  }
  var user = (function () { try { return userById(localStorage.getItem(CUR_KEY)); } catch (e) { return null; } })();

  var state = user ? load() : blankState();
  var urls = { avatar: null, videos: [null, null, null] };
  var openCfg = false;
  var root = document.getElementById('app');

  function load() {
    try {
      var raw = localStorage.getItem(KEY + ':' + user.id);
      if (raw) { var s = JSON.parse(raw); return Object.assign(blankState(), s); }
    } catch (e) { /* 저장소를 못 쓰면 메모리로만 동작 */ }
    return blankState();
  }
  function save() { if (!user) return; try { localStorage.setItem(KEY + ':' + user.id, JSON.stringify(state)); } catch (e) { /* 용량 초과 등 */ } }

  /* ---------- IndexedDB (아바타 이미지·영상) ---------- */
  var dbp = null;
  function db() {
    if (!dbp) dbp = new Promise(function (res, rej) {
      try {
        var rq = indexedDB.open('fit-test', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('blobs'); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var tx = d.transaction('blobs', mode), st = tx.objectStore('blobs'), rq = fn(st);
        tx.oncomplete = function () { res(rq && rq.result); };
        tx.onerror = function () { rej(tx.error); };
        tx.onabort = function () { rej(tx.error || new Error('저장 취소')); };
      });
    });
  }
  function rawGet(k) { return idb('readonly', function (s) { return s.get(k); }).catch(function () { return null; }); }
  function rawPut(k, v) { return idb('readwrite', function (s) { return s.put(v, k); }); }
  function rawDel(k) { return idb('readwrite', function (s) { return s.delete(k); }); }
  /* 로그인한 프로필의 이미지·영상 키는 '사용자id:avatar' 형태 */
  function bk(k) { return user.id + ':' + k; }
  function blobGet(k) { return rawGet(bk(k)); }
  function blobPut(k, v) { return rawPut(bk(k), v); }
  function blobDel(k) { return rawDel(bk(k)); }
  var MEDIA_KEYS = ['avatar', 'video0', 'video1', 'video2'];

  function clearUrls() {
    if (urls.avatar) URL.revokeObjectURL(urls.avatar);
    urls.videos.forEach(function (u) { if (u) URL.revokeObjectURL(u); });
    urls = { avatar: null, videos: [null, null, null] };
  }
  function loadMedia() {
    if (!user) return Promise.resolve();
    var uid = user.id;
    return Promise.all(MEDIA_KEYS.map(blobGet)).then(function (r) {
      if (!user || user.id !== uid) return;
      clearUrls();
      if (r[0]) urls.avatar = URL.createObjectURL(r[0]);
      for (var i = 0; i < 3; i++) if (r[i + 1]) urls.videos[i] = URL.createObjectURL(r[i + 1]);
    });
  }

  function shrink(file, max, quality) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('변환 실패')); }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(u); rej(new Error('이미지를 읽을 수 없습니다')); };
      img.src = u;
    });
  }
  function blobToDataUrl(b) {
    return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(f.result); }; f.readAsDataURL(b); });
  }

  /* ---------- 유틸 ---------- */
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setPath(obj, path, val) {
    var p = path.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = val;
  }
  function getPath(obj, path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function cfgNow() {
    var c = JSON.parse(JSON.stringify(BASE_CFG));
    if (state.cfg) {
      Object.keys(state.cfg.grades || {}).forEach(function (k) { if (c.grades[k]) c.grades[k].th = state.cfg.grades[k].slice(); });
      Object.keys(state.cfg.fabric || {}).forEach(function (k) { if (c.fabric[k]) c.fabric[k].bonus = state.cfg.fabric[k]; });
    }
    return c;
  }
  function item(id) { return state.closet.filter(function (x) { return x.id === id; })[0] || null; }
  function sgn(n) { return (n >= 0 ? '+' : '') + n; }
  function srcTag(s) { return s === 'real' ? '<span class="tag real">실측</span>' : '<span class="tag">추정</span>'; }
  function fieldLabel(it, f) { return it.measureType === 'circ' ? f[1].replace('단면', '둘레') : f[1]; }

  function seg(path, cur, list) {
    return '<div class="seg" role="group">' + list.map(function (o) {
      return '<button type="button" data-act="set" data-path="' + path + '" data-val="' + o[0] + '" class="' + (cur === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- 화면: 로그인 ---------- */
  function blankLogin() { return { mode: 'list', id: null, nick: '', pin: '', pin2: '', gender: 'male', height: '', weight: '', err: '', avatar: null, avatarUrl: null, fails: 0, until: 0 }; }
  var lg = blankLogin();
  /* 틀린 PIN 횟수·잠금 시각은 화면을 바꿔도 유지한다 */
  function resetLogin(mode, id) {
    if (lg.avatarUrl) URL.revokeObjectURL(lg.avatarUrl);
    var f = lg.fails, t = lg.until;
    lg = blankLogin(); lg.fails = f; lg.until = t;
    if (mode) lg.mode = mode;
    if (id) lg.id = id;
  }
  var thumbs = {};
  function loadThumbs() {
    readUsers().forEach(function (u) {
      if (u.id in thumbs) return;
      thumbs[u.id] = null;
      rawGet(u.id + ':avatar').then(function (b) { if (b && u.id in thumbs) { thumbs[u.id] = URL.createObjectURL(b); if (!user) render(); } });
    });
  }
  function clearThumbs() { Object.keys(thumbs).forEach(function (k) { if (thumbs[k]) URL.revokeObjectURL(thumbs[k]); }); thumbs = {}; }
  function hasLegacy() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function pinField(k, label) {
    return '<label class="f">' + label + '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" data-lg="' + k + '" value="' + h(lg[k]) + '"></label>';
  }
  function avatarDot(u, big) {
    var t = thumbs[u.id], cls = 'uav' + (big ? ' big' : '');
    return t ? '<img class="' + cls + '" alt="" src="' + t + '">' : '<span class="' + cls + '">' + h(String(u.nick).charAt(0)) + '</span>';
  }
  function viewLogin() {
    var users = readUsers(), err = lg.err ? '<div class="warn">' + h(lg.err) + '</div>' : '';
    var bar = '<div class="bar"><div class="brand">' + LOGO + '<div class="wm">AI FIT<i></i></div><span class="mini">의류 핏 체크</span></div></div>';
    var u = lg.id ? userById(lg.id) : null, body, foot;
    if ((lg.mode === 'pin' || lg.mode === 'del') && u) {
      var del = lg.mode === 'del';
      body = '<div class="ucard">' + avatarDot(u, true) + '<div><b>' + h(u.nick) + '</b><div class="note">' + (del ? '프로필을 삭제하려면 PIN을 입력하세요' : 'PIN 4자리를 입력하세요') + '</div></div></div>' +
        pinField('pin', 'PIN') + err +
        (del ? '<div class="warn">삭제하면 이 프로필의 내 정보, 옷장, 캐릭터 이미지와 영상이 이 기기에서 모두 지워집니다.</div>' : '');
      foot = '<button class="btn ghost" data-act="lgBack">취소</button><button class="btn p" data-act="' + (del ? 'lgDelOk' : 'lgLogin') + '">' + (del ? '삭제' : '로그인') + '</button>';
    } else if (lg.mode === 'new') {
      body = '<div class="sec">새 프로필</div>' +
        '<label class="f">닉네임<input type="text" maxlength="12" autocomplete="off" data-lg="nick" value="' + h(lg.nick) + '" placeholder="예) 민성"></label>' +
        '<div class="row2">' + pinField('pin', 'PIN 4자리') + pinField('pin2', 'PIN 확인') + '</div>' +
        '<div class="sec">내 정보 (나중에 바꿀 수 있어요)</div>' +
        '<div class="seg" role="group">' + [['male', '남성'], ['female', '여성']].map(function (o) {
          return '<button type="button" data-act="lgSet" data-k="gender" data-v="' + o[0] + '" class="' + (lg.gender === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="row2"><label class="f">키<div class="inwrap"><input type="number" inputmode="decimal" data-lg="height" value="' + h(lg.height) + '"><small>cm</small></div></label>' +
        '<label class="f">몸무게<div class="inwrap"><input type="number" inputmode="decimal" data-lg="weight" value="' + h(lg.weight) + '"><small>kg</small></div></label></div>' +
        '<div class="sec">내 캐릭터 (선택)</div>' +
        '<div class="ucard">' + (lg.avatarUrl ? '<img class="uav big" alt="캐릭터 미리보기" src="' + lg.avatarUrl + '">' : '<span class="uav big">?</span>') +
        '<div><div class="note">만들어 둔 캐릭터(아바타) 이미지를 연결합니다. 동작 영상은 로그인 후 내 정보에서 연결할 수 있어요.</div>' +
        '<label class="btn sm" style="cursor:pointer;margin-top:6px;display:inline-block">이미지 선택<input type="file" accept="image/*" data-file="lgAvatar" hidden></label></div></div>' +
        (!users.length && hasLegacy() ? '<div class="note">이 기기에 전에 입력한 정보가 있어 첫 프로필로 옮겨집니다.</div>' : '') + err;
      foot = (users.length ? '<button class="btn ghost" data-act="lgBack">취소</button>' : '') + '<button class="btn p" data-act="lgCreate">만들고 시작하기</button>';
    } else {
      body = HERO + '<div class="sec">' + (users.length ? '프로필 선택' : '시작하기') + '</div>' +
        (users.length ? '<div class="ulist">' + users.map(function (x) {
          return '<div class="urow"><button class="ugo" data-act="lgPick" data-id="' + h(x.id) + '">' + avatarDot(x) + '<b>' + h(x.nick) + '</b></button>' +
            '<button class="btn sm danger" data-act="lgDel" data-id="' + h(x.id) + '" aria-label="' + h(x.nick) + ' 삭제">삭제</button></div>';
        }).join('') + '</div>' : '<div class="note">닉네임과 PIN으로 프로필을 만들면, 입력한 내 정보와 캐릭터를 다음에 그대로 불러옵니다.</div>') +
        '<div class="note">프로필과 데이터는 이 기기(브라우저) 안에만 저장되며 서버로 보내지 않습니다. PIN은 같은 기기를 함께 쓸 때 서로 구분하는 잠금입니다.</div>';
      foot = '<button class="btn p" data-act="lgNew">새 프로필 만들기</button>';
    }
    return bar + '<div class="body">' + body + '</div><div class="foot">' + foot + '</div>';
  }
  function lgErr(msg) { lg.err = msg; render(); }

  /* 로그인 도입 전 단일 사용자 데이터를 첫 프로필로 옮긴다 */
  function migrateLegacy() {
    var old = null;
    try { var raw = localStorage.getItem(KEY); if (raw) old = Object.assign(blankState(), JSON.parse(raw)); } catch (e) { old = null; }
    if (!old) return Promise.resolve(null);
    return Promise.all(MEDIA_KEYS.map(function (k) {
      return rawGet(k).then(function (b) { return b ? rawPut(bk(k), b).then(function () { return rawDel(k); }) : null; });
    })).then(function () { try { localStorage.removeItem(KEY); } catch (e) {} return old; }, function () { return old; });
  }

  function enterApp() {
    try { localStorage.setItem(CUR_KEY, user.id); } catch (e) {}
    resetLogin(); lg.fails = 0; lg.until = 0; sheet = null;
    clearUrls(); render(); window.scrollTo(0, 0);
    try { history.replaceState({ s: state.step }, ''); } catch (e) {}
    loadMedia().then(render);
  }
  function lgCreate() {
    var users = readUsers(), nick = String(lg.nick || '').trim();
    if (!nick) return lgErr('닉네임을 입력해 주세요.');
    if (users.some(function (u) { return u.nick === nick; })) return lgErr('이미 있는 닉네임입니다.');
    if (!/^\d{4}$/.test(lg.pin)) return lgErr('PIN은 숫자 4자리로 입력해 주세요.');
    if (lg.pin !== lg.pin2) return lgErr('PIN 확인이 일치하지 않습니다.');
    var salt = Math.random().toString(36).slice(2, 10);
    var u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nick: nick, salt: salt, pin: pinHash(salt, lg.pin), created: Date.now() };
    var first = !users.length;
    users.push(u); writeUsers(users);
    user = u;
    var info = { gender: lg.gender, height: lg.height, weight: lg.weight }, av = lg.avatar;
    (first ? migrateLegacy() : Promise.resolve(null)).then(function (old) {
      state = old || blankState();
      state.profile.gender = info.gender;
      if (info.height !== '') state.profile.height = info.height;
      if (info.weight !== '') state.profile.weight = info.weight;
      state.step = 'profile';
      save();
      return av ? blobPut('avatar', av).catch(function () { alert('캐릭터 이미지를 저장하지 못했습니다. 내 정보에서 다시 연결해 주세요.'); }) : null;
    }).then(enterApp);
  }
  function checkPin(u) {
    if (Date.now() < lg.until) { lg.pin = ''; lgErr(Math.ceil((lg.until - Date.now()) / 1000) + '초 뒤에 다시 시도해 주세요.'); return false; }
    if (pinHash(u.salt, lg.pin) === u.pin) return true;
    lg.fails++; lg.pin = '';
    if (lg.fails >= 5) { lg.fails = 0; lg.until = Date.now() + 30000; lgErr('PIN이 5번 틀려 30초 동안 잠깁니다.'); }
    else lgErr('PIN이 맞지 않습니다.');
    return false;
  }
  function lgLogin() {
    var u = userById(lg.id);
    if (!u) { resetLogin(); return render(); }
    if (!checkPin(u)) return;
    user = u; state = load(); enterApp();
  }
  function lgDelOk() {
    var u = userById(lg.id);
    if (!u) { resetLogin(); return render(); }
    if (!checkPin(u)) return;
    if (!confirm('"' + u.nick + '" 프로필과 데이터를 이 기기에서 삭제할까요? 되돌릴 수 없습니다.')) return;
    writeUsers(readUsers().filter(function (x) { return x.id !== u.id; }));
    try { localStorage.removeItem(KEY + ':' + u.id); } catch (e) {}
    MEDIA_KEYS.forEach(function (k) { rawDel(u.id + ':' + k).catch(function () {}); });
    if (thumbs[u.id]) URL.revokeObjectURL(thumbs[u.id]);
    delete thumbs[u.id];
    resetLogin(); render();
  }
  function logout() {
    try { localStorage.removeItem(CUR_KEY); } catch (e) {}
    user = null; state = blankState(); sheet = null; openCfg = false;
    clearUrls(); clearThumbs(); lg = blankLogin();
    render(); window.scrollTo(0, 0);
  }

  function profileForm() {
    var p = state.profile;
    var body = E.bodyOf(p, cfgNow());
    var rows = MFIELDS.map(function (f) {
      var v = p.m[f[0]] == null ? '' : p.m[f[0]];
      var est = body.vals[f[0]];
      return '<div class="mrow"><span>' + f[1] + '</span>' +
        '<div class="inwrap"><input type="number" inputmode="decimal" step="0.1" id="m-' + f[0] + '" data-path="profile.m.' + f[0] + '" data-hint="' + f[0] + '" value="' + h(v) + '" placeholder="' + (est != null ? est : '') + '" aria-label="' + f[1] + '"><small>' + f[2] + '</small></div>' +
        '<span id="tag-' + f[0] + '">' + (v !== '' ? srcTag('real') : (est != null ? srcTag('est') : '')) + '</span></div>';
    }).join('');
    return seg('profile.gender', p.gender, [['male', '남성'], ['female', '여성']]) +
      '<div class="row2"><label class="f">키<div class="inwrap"><input type="number" inputmode="decimal" id="in-height" data-path="profile.height" data-hint="1" value="' + h(p.height) + '"><small>cm</small></div></label>' +
      '<label class="f">몸무게<div class="inwrap"><input type="number" inputmode="decimal" id="in-weight" data-path="profile.weight" data-hint="1" value="' + h(p.weight) + '"><small>kg</small></div></label></div>' +
      '<div class="sec">내 치수 (비워 두면 키·몸무게로 추정)</div><div>' + rows + '</div>' +
      '<div class="note">추정식은 초안입니다. 실측값을 입력할수록 정확해집니다.</div>' +
      '<div class="sec">선호 핏</div>' + seg('profile.pref', p.pref, PREFS);
  }
  function mediaCard() {
    return '<div class="card"><div class="h"><span>내 아바타</span></div>' +
      '<div class="note">이미 만든 아바타 이미지와 동작 영상을 연결합니다. 이 기기 안에만 저장됩니다.</div>' +
      mediaRow('avatar', '아바타 이미지', 'image/*', !!urls.avatar) +
      MOTIONS.map(function (m, i) { return mediaRow('video' + i, '영상 · ' + m, 'video/*', !!urls.videos[i]); }).join('') + '</div>';
  }
  function mediaRow(kind, label, accept, has) {
    return '<div class="line" style="align-items:center"><span>' + label + ' ' + (has ? '<span class="tag real">연결됨</span>' : '<span class="tag">없음</span>') + '</span>' +
      '<span class="acts"><label class="btn sm" style="cursor:pointer">선택<input type="file" accept="' + accept + '" data-file="' + kind + '" hidden></label>' +
      (has ? '<button class="btn sm danger" data-act="clearFile" data-kind="' + kind + '">삭제</button>' : '') + '</span></div>';
  }

  var GLYPH = {
    top: '<path d="M30 20 L42 14 Q50 22 58 14 L70 20 L80 34 L68 40 L68 82 L32 82 L32 40 L20 34Z"/>',
    bottom: '<path d="M32 14 H68 L72 86 H55 L50 40 L45 86 H28Z"/>',
    shoe: '<path d="M14 58 Q14 44 28 44 L40 44 Q46 56 62 58 L86 62 Q90 72 84 76 L16 76 Q12 70 14 58Z"/>'
  };
  function viewEditor(cat) {
    var d = state.draft;
    var fields = FIELDS[cat];
    var thead = '<tr><th>' + (cat === 'shoe' ? '' : 'cm') + '</th>' + d.sizes.map(function (s, i) {
      return '<th><input type="text" data-path="draft.sizes.' + i + '.label" value="' + h(s.label) + '" aria-label="사이즈 이름" ' + (cat === 'shoe' ? 'inputmode="numeric"' : '') + '></th>';
    }).join('') + '</tr>';
    var rows = fields.map(function (f) {
      return '<tr><td>' + h(fieldLabel(d, f)) + '</td>' + d.sizes.map(function (s, i) {
        return '<td><input type="number" inputmode="decimal" step="0.1" data-path="draft.sizes.' + i + '.' + f[0] + '" value="' + h(s[f[0]] == null ? '' : s[f[0]]) + '" aria-label="' + h(f[1]) + ' ' + h(s.label) + '"></td>';
      }).join('') + '</tr>';
    }).join('');
    var refSel = d.sizes.map(function (s) { return '<option value="' + h(s.label) + '"' + (d.refSize === s.label ? ' selected' : '') + '>' + h(s.label) + '</option>'; }).join('');
    return '<div class="body"><div class="sec">' + CATS[cat] + ' ' + (d.id ? '수정' : '새 상품') + '</div>' +
      '<label class="f">상품 이름<input type="text" data-path="draft.name" value="' + h(d.name) + '" placeholder="예) 스판 라운드 티셔츠"></label>' +
      '<label class="f">가격 (원, 선택)<input type="number" inputmode="numeric" min="0" data-path="draft.price" value="' + h(d.price == null ? '' : d.price) + '" placeholder="예) 39000"></label>' +
      '<label class="f">상품 링크 (선택)<input type="url" data-path="draft.url" value="' + h(d.url || '') + '" placeholder="https://..."></label>' +
      '<div class="photo">' + (d.photo ? '<img alt="상품 사진" src="' + d.photo + '">' : '상품 사진 (선택, 참고용)') + '</div>' +
      '<label class="btn sm" style="cursor:pointer;align-self:flex-start">사진 선택<input type="file" accept="image/*" data-file="draftPhoto" hidden></label>' +
      (cat === 'shoe' ? '' : '<div class="sec">실측표 방식</div>' + seg('draft.measureType', d.measureType, [['flat', '단면(평평하게 잰 값)'], ['circ', '둘레']])) +
      (cat === 'shoe' ? '' : '<div class="sec">소재</div><div class="chips">' + Object.keys(BASE_CFG.fabric).map(function (k) {
        return '<button class="chip' + (d.fabric === k ? ' on' : '') + '" data-act="set" data-path="draft.fabric" data-val="' + k + '">' + BASE_CFG.fabric[k].label + '</button>';
      }).join('') + '</div>') +
      '<div class="sec">사이즈별 실측표</div><div class="tablewrap"><table class="t">' + thead + rows + '</table></div>' +
      '<div class="acts"><button class="btn sm" data-act="addSize">＋ 사이즈</button><button class="btn sm" data-act="delSize"' + (d.sizes.length <= 1 ? ' disabled' : '') + '>− 마지막 사이즈</button></div>' +
      (cat === 'shoe' ? '<div class="note">안쪽 길이를 모르면 비워 두세요. 표기 사이즈(mm)+8mm 로 계산합니다.</div>' :
        '<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-path="draft.isRef"' + (d.isRef ? ' checked' : '') + ' data-bool="1"> 내가 평소 잘 맞게 입는 옷 (기준 옷)</label>' +
        (d.isRef ? '<label class="f">내가 입는 사이즈<select data-path="draft.refSize">' + refSel + '</select></label>' : '')) +
      '</div><div class="foot"><button class="btn ghost" data-act="cancelEdit">취소</button><button class="btn p" data-act="saveDraft">저장</button></div>';
  }

  function evaluateAll() {
    var items = [];
    ['top', 'bottom', 'shoe'].forEach(function (cat) {
      var s = state.sel[cat], it = s && item(s.id);
      if (!it) return;
      var ref = null;
      if (cat !== 'shoe') {
        var r = state.closet.filter(function (x) { return x.cat === cat && x.isRef && x.id !== it.id; })[0];
        if (r) ref = { garment: r, row: r.sizes.filter(function (z) { return z.label === r.refSize; })[0] || r.sizes[0] };
      }
      items.push({ cat: cat, garment: it, size: s.size || null, ref: ref });
    });
    return E.evaluate({ profile: state.profile, items: items }, cfgNow());
  }

  function scaleBar(p) {
    var th = p.th, lo = th[0] - 6, hi = th[3] + 8;
    var w = [th[0] - lo, th[1] - th[0], th[2] - th[1], th[3] - th[2], hi - th[3]];
    var pos = Math.max(0, Math.min(1, (p.ease - lo) / (hi - lo))) * 100;
    return '<div class="scale" role="img" aria-label="' + h(p.label) + ' 여유 ' + sgn(p.ease) + p.unit + ', ' + h(p.grade) + '">' + w.map(function (x) { return '<i style="flex:' + x + '"></i>'; }).join('') + '<u style="left:' + pos + '%"></u></div>';
  }

  function reelMedia() {
    var m = state.motion, inner, badge = '';
    if (urls.videos[m]) inner = '<video src="' + urls.videos[m] + '" loop playsinline autoplay muted></video>';
    else if (urls.avatar) { inner = '<img alt="내 아바타" src="' + urls.avatar + '">'; badge = '이 동작의 영상이 없어 이미지를 표시합니다'; }
    else {
      inner = '<svg viewBox="0 0 120 260" role="img" aria-label="아바타 자리 표시"><circle cx="60" cy="26" r="17" fill="var(--skin)"/><rect x="54" y="40" width="12" height="10" fill="var(--skin)"/>' +
        '<path d="M30 56 Q60 46 90 56 L96 120 L82 124 L80 100 L80 150 L40 150 L40 100 L38 124 L24 120 Z" fill="rgba(20,20,20,.08)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M41 150 L79 150 L82 226 L66 226 L60 170 L54 226 L38 226 Z" fill="rgba(20,20,20,.14)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      badge = '설정에서 아바타를 연결하면 여기에 표시됩니다';
    }
    return '<div class="rmedia" id="rmedia">' + inner + (badge ? '<span class="rbadge">' + h(badge) + '</span>' : '') + '</div>';
  }
  var IC = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  };

  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; }
  }
  function priceText(v) {
    var n = Number(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
    return n > 0 ? n.toLocaleString('ko-KR') + '원' : '';
  }
  function buyLink(it, cls) {
    var u = safeUrl(it.url);
    return u ? '<a class="' + cls + '" href="' + h(u) + '" target="_blank" rel="noopener noreferrer">구매하러 가기</a>' : '';
  }

  function resultCard(r) {
    var cur = r.current, it = r.garment;
    if (!cur) return '<div class="card"><div class="h">' + CATS[r.cat] + ' · ' + h(it.name) + '</div><div class="warn">' + (r.chosen ? '선택한 사이즈 "' + h(r.chosen) + '" 의 실측값이 없습니다.' : '실측값이 입력된 사이즈가 없습니다. 상품의 실측표를 입력해 주세요.') + '</div></div>';
    var p = cur.primary;
    var head = '<div class="h"><span>' + CATS[r.cat] + ' · ' + h(it.name) + ' <span class="sub">' + h(r.chosen) + '</span></span>' +
      (p ? '<span class="grade gk-' + p.gradeKey + '">' + p.grade + ' ' + sgn(p.ease) + p.unit + '</span>' : '') + '</div>';
    var out = head;
    if (priceText(it.price) || safeUrl(it.url)) out += '<div class="line"><span>' + (priceText(it.price) ? '가격 ' + priceText(it.price) : '') + '</span>' + buyLink(it, 'buy') + '</div>';
    if (p) out += scaleBar(p) + '<div class="line"><span>' + h(p.label) + ' ' + srcTag(p.src) + '</span><b>' + h(p.detail) + '</b></div>';
    cur.parts.forEach(function (x) {
      if (x === p) return;
      if (x.kind === 'circ') out += '<div class="line"><span>' + h(x.label) + ' ' + srcTag(x.src) + ' <span class="grade gk-' + x.gradeKey + '">' + x.grade + '</span></span><b>' + h(x.detail) + '</b></div>';
      else out += '<div class="line"><span>' + h(x.label) + ' ' + srcTag(x.src) + '</span><b>' + h(x.text) + '</b></div>';
    });
    var prefName = PREFS.filter(function (x) { return x[0] === state.profile.pref; })[0][1];
    if (r.recommended) {
      out += '<div class="rec">' + (r.auto ? '사이즈를 고르지 않아 ' : '') + '선호 핏 <b>' + prefName + '</b> 기준 추천 사이즈는 <b>' + h(r.recommended) + '</b>' + (r.auto || r.recommended === r.chosen ? '입니다.' : '입니다 (선택한 사이즈: ' + h(r.chosen) + ').') + '</div>';
    }
    if (r.refDiff && r.refDiff.length) out += '<div class="line"><span>기준 옷 대비</span><b>' + r.refDiff.map(function (d) { return h(d.label) + ' ' + sgn(d.diff); }).join(' · ') + '</b></div>';
    out += compareTable(r);
    var fk = r.cat + ':' + it.id + ':' + r.chosen, fv = state.feel[fk];
    var opts = '<option value="">선택</option>' + BASE_CFG.gradeNames[r.cat === 'shoe' ? 'shoe' : 'body'].map(function (n, i) { return '<option value="' + i + '"' + (String(fv) === String(i) ? ' selected' : '') + '>' + n + '</option>'; }).join('');
    var match = '';
    if (fv !== undefined && fv !== '' && p) match = Number(fv) === p.gradeIdx ? ' <span class="ok">앱 판정과 일치</span>' : ' <span class="ng">앱: ' + p.grade + '</span>';
    out += '<div class="feel">실제 입어본 느낌 <select data-feel="' + h(fk) + '" aria-label="실제 입어본 느낌">' + opts + '</select>' + match + '</div>';
    return '<div class="card">' + out + '</div>';
  }

  function compareTable(r) {
    var keys = [], labels = {};
    r.all.forEach(function (e) { e.parts.forEach(function (p) { if (p.kind === 'circ' && keys.indexOf(p.key) < 0) { keys.push(p.key); labels[p.key] = p.label; } }); });
    if (!keys.length || r.all.length < 2) return '';
    var head = '<tr><th></th>' + r.all.map(function (e) { return '<th class="' + (e.size === r.chosen ? 'cur' : '') + '">' + h(e.size) + (e.size === r.recommended ? ' ★' : '') + '</th>'; }).join('') + '</tr>';
    var rows = keys.map(function (k, ri) {
      return '<tr><td>' + h(labels[k]) + ' 여유</td>' + r.all.map(function (e) {
        var p = e.parts.filter(function (x) { return x.key === k; })[0];
        return '<td class="' + (e.size === r.chosen ? 'cur' : '') + '">' + (p ? sgn(p.ease) + '<br><span class="grade gk-' + p.gradeKey + '">' + p.grade + '</span>' : '-') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<details><summary>사이즈 비교</summary><div class="tablewrap"><table class="t">' + head + rows + '</table></div><div class="note">★ 선호 핏 기준 추천 사이즈</div></details>';
  }

  function cfgPanel() {
    var c = cfgNow();
    var rows = Object.keys(c.grades).map(function (k) {
      var g = c.grades[k];
      return '<div class="grid5"><span>' + g.label + '<br><span class="sub">' + g.unit + '</span></span>' + g.th.map(function (v, i) {
        return '<input type="number" step="0.5" data-cfg="grades.' + k + '.' + i + '" value="' + v + '" aria-label="' + g.label + ' 경계 ' + (i + 1) + '">';
      }).join('') + '</div>';
    }).join('');
    var fab = Object.keys(c.fabric).map(function (k) {
      return '<label class="f">' + c.fabric[k].label + '<input type="number" step="0.5" data-cfg="fabric.' + k + '" value="' + c.fabric[k].bonus + '"></label>';
    }).join('');
    return '<details' + (openCfg ? ' open' : '') + ' id="cfgd"><summary>등급 기준 보정</summary>' +
      '<div class="note" style="margin-top:6px">경계값을 바꾸면 결과가 바로 달라집니다. 열: 쪼임|타이트, 타이트|정핏, 정핏|여유, 여유|오버핏</div>' + rows +
      '<div class="sec" style="margin-top:10px">소재 보정 (+ 이면 조이는 쪽을 더 너그럽게 판정)</div><div class="row2">' + fab + '</div>' +
      '<button class="btn sm" style="margin-top:8px" data-act="resetCfg">기준 초기화</button></details>';
  }

  var sheet = null;
  function refreshHints() {
    var body = E.bodyOf(state.profile, cfgNow());
    MFIELDS.forEach(function (f) {
      var inp = document.getElementById('m-' + f[0]), tag = document.getElementById('tag-' + f[0]);
      if (!inp || !tag) return;
      var est = body.vals[f[0]];
      inp.placeholder = est != null ? est : '';
      tag.innerHTML = inp.value !== '' ? srcTag('real') : (est != null ? srcTag('est') : '');
    });
  }

  /* ---------- 동작 ---------- */
  function blankDraft(cat) {
    var sizes = cat === 'shoe' ? ['250', '260', '270'] : ['S', 'M', 'L'];
    return { id: null, cat: cat, name: '', measureType: 'flat', fabric: 'normal', photo: '', price: '', url: '', isRef: false, refSize: '', sizes: sizes.map(function (l) { return { label: l }; }) };
  }
  function saveDraft() {
    var d = state.draft;
    d.sizes = d.sizes.filter(function (s) { return String(s.label || '').trim() !== ''; });
    if (!d.sizes.length) { alert('사이즈 이름을 하나 이상 입력해 주세요.'); return; }
    d.name = String(d.name || '').trim() || (CATS[d.cat] + ' ' + state.seq);
    if (d.isRef) {
      if (!d.refSize || !d.sizes.some(function (s) { return s.label === d.refSize; })) d.refSize = d.sizes[0].label;
      state.closet.forEach(function (x) { if (x.cat === d.cat && x.id !== d.id) x.isRef = false; });
    }
    var rec = JSON.parse(JSON.stringify(d));
    if (rec.id) { state.closet = state.closet.map(function (x) { return x.id === rec.id ? rec : x; }); }
    else { rec.id = 'p' + (state.seq++); state.closet.push(rec); }
    state.draft = null;
    var cur = state.sel[rec.cat];
    if (!cur || cur.id === rec.id) state.sel[rec.cat] = { id: rec.id, size: cur && rec.sizes.some(function (s) { return s.label === cur.size; }) ? cur.size : null };
    save(); render();
  }

  var ACT = {
    lgNew: function () { resetLogin('new'); render(); },
    lgPick: function (el) { resetLogin('pin', el.dataset.id); render(); },
    lgDel: function (el) { resetLogin('del', el.dataset.id); render(); },
    lgBack: function () { resetLogin(); render(); },
    lgSet: function (el) { lg[el.dataset.k] = el.dataset.v; render(); },
    lgCreate: lgCreate,
    lgLogin: lgLogin,
    lgDelOk: lgDelOk,
    logout: logout,
    set: function (el) {
      var v = el.dataset.val;
      setPath(state, el.dataset.path, v);
      save();
      render();
    },
    new: function (el) { state.draft = blankDraft(el.dataset.cat); render(); },
    edit: function (el) { var it = item(el.dataset.id); state.draft = JSON.parse(JSON.stringify(it)); render(); },
    cancelEdit: function () { state.draft = null; render(); },
    saveDraft: saveDraft,
    delItem: function (el) {
      var it = item(el.dataset.id);
      if (!it || !confirm('"' + it.name + '" 을(를) 내 옷장에서 삭제할까요?')) return;
      state.closet = state.closet.filter(function (x) { return x.id !== it.id; });
      Object.keys(state.sel).forEach(function (c) { if (state.sel[c] && state.sel[c].id === it.id) delete state.sel[c]; });
      save(); render();
    },
    addSize: function () {
      var d = state.draft, last = d.sizes[d.sizes.length - 1], nx = '';
      if (d.cat === 'shoe') nx = String((parseInt(last.label, 10) || 270) + 5);
      else { var seq = ['XS', 'S', 'M', 'L', 'XL', 'XXL']; var i = seq.indexOf(last.label); nx = i >= 0 && i < seq.length - 1 ? seq[i + 1] : ''; }
      d.sizes.push({ label: nx }); render();
    },
    delSize: function () { if (state.draft.sizes.length > 1) { state.draft.sizes.pop(); render(); } },
    motion: function (el) { state.motion = Number(el.dataset.i); save(); render(); },
    clearFile: function (el) {
      var k = el.dataset.kind;
      blobDel(k).then(function () {
        if (k === 'avatar') { if (urls.avatar) URL.revokeObjectURL(urls.avatar); urls.avatar = null; }
        else { var i = Number(k.slice(5)); if (urls.videos[i]) URL.revokeObjectURL(urls.videos[i]); urls.videos[i] = null; }
        render();
      });
    },
    resetCfg: function () { state.cfg = null; save(); render(); },
    sample: function () {
      if ((state.closet.length || state.profile.height) && !confirm('입력한 내 정보와 옷장이 예시 데이터로 바뀝니다. 계속할까요?')) return;
      state.profile = { gender: 'male', height: '172', weight: '66', pref: 'fit', m: { chest: '96', shoulder: '44', waist: '78', foot: '255' } };
      state.closet = [
        { id: 'p1', cat: 'top', name: '예시 스판 티셔츠', measureType: 'flat', fabric: 'stretch', photo: '', isRef: false, refSize: '', sizes: [
          { label: 'S', chest: '52', shoulder: '44', length: '66', sleeve: '60' }, { label: 'M', chest: '55', shoulder: '46', length: '69', sleeve: '62' }, { label: 'L', chest: '58', shoulder: '48', length: '72', sleeve: '64' }] },
        { id: 'p2', cat: 'top', name: '예시 기준 셔츠(평소 입는 옷)', measureType: 'flat', fabric: 'normal', photo: '', isRef: true, refSize: 'M', sizes: [
          { label: 'M', chest: '53', shoulder: '45', length: '70', sleeve: '61' }] },
        { id: 'p3', cat: 'bottom', name: '예시 슬랙스', measureType: 'flat', fabric: 'normal', photo: '', isRef: false, refSize: '', sizes: [
          { label: 'S', waist: '39', hip: '50', thigh: '28', rise: '26', inseam: '74' }, { label: 'M', waist: '42', hip: '53', thigh: '30', rise: '27', inseam: '76' }, { label: 'L', waist: '45', hip: '56', thigh: '32', rise: '28', inseam: '78' }] },
        { id: 'p4', cat: 'shoe', name: '예시 스니커즈', measureType: '', fabric: 'normal', photo: '', isRef: false, refSize: '', sizes: [
          { label: '250' }, { label: '260', inner: '268' }, { label: '270' }] }
      ];
      state.sel = { top: { id: 'p1', size: 'M' }, bottom: { id: 'p3', size: null }, shoe: { id: 'p4', size: '260' } };
      state.seq = 10; state.feel = {};
      save(); render();
    },
    resetAll: function () {
      if (!confirm('이 프로필에 입력한 내 정보, 옷장, 연결한 캐릭터와 영상이 모두 지워집니다. 프로필(닉네임·PIN)은 남습니다. 계속할까요?')) return;
      state = blankState(); save();
      MEDIA_KEYS.forEach(function (k) { blobDel(k).catch(function () {}); });
      clearUrls();
      render();
    }
  };

  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.lg) {
      lg[t.dataset.lg] = t.value;
      if (t.dataset.lg === 'pin' && lg.mode === 'pin' && /^\d{4}$/.test(t.value)) lgLogin();
      return;
    }
    if (t.dataset.path && t.type !== 'checkbox' && t.tagName !== 'SELECT') {
      setPath(state, t.dataset.path, t.value); save();
      if (t.dataset.hint) refreshHints();
    }
  });

  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.dataset || !e.target.dataset.lg) return;
    e.preventDefault();
    if (lg.mode === 'new') lgCreate(); else if (lg.mode === 'pin') lgLogin(); else if (lg.mode === 'del') lgDelOk();
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.path && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
      setPath(state, t.dataset.path, t.type === 'checkbox' ? t.checked : t.value); save();
      if (t.dataset.bool) render();
    } else if (t.dataset.feel !== undefined) {
      state.feel[t.dataset.feel] = t.value; save(); render();
    } else if (t.dataset.cfg) {
      var parts = t.dataset.cfg.split('.'), v = parseFloat(t.value);
      if (!isFinite(v)) { render(); return; }
      if (!state.cfg) state.cfg = { grades: {}, fabric: {} };
      if (parts[0] === 'grades') {
        var cur = (state.cfg.grades[parts[1]] || BASE_CFG.grades[parts[1]].th).slice();
        cur[Number(parts[2])] = v;
        if (!cur.every(function (x, i) { return i === 0 || x > cur[i - 1]; })) { alert('경계값은 왼쪽부터 커지는 순서여야 합니다.'); render(); return; }
        state.cfg.grades[parts[1]] = cur;
      } else { state.cfg.fabric[parts[1]] = v; }
      openCfg = true; save(); render();
    } else if (t.dataset.file && t.files && t.files[0]) {
      handleFile(t.dataset.file, t.files[0]);
    }
  });

  function handleFile(kind, file) {
    if (kind === 'lgAvatar') {
      shrink(file, 1000, 0.92).then(function (b) { if (lg.avatarUrl) URL.revokeObjectURL(lg.avatarUrl); lg.avatar = b; lg.avatarUrl = URL.createObjectURL(b); render(); })
        .catch(function (err) { alert(err.message); });
    } else if (kind === 'draftPhoto') {
      shrink(file, 240, 0.8).then(blobToDataUrl).then(function (u) { state.draft.photo = u; save(); render(); }).catch(function (err) { alert(err.message); });
    } else if (kind === 'avatar') {
      shrink(file, 1000, 0.92).then(function (b) { return blobPut('avatar', b).then(function () { if (urls.avatar) URL.revokeObjectURL(urls.avatar); urls.avatar = URL.createObjectURL(b); render(); }); })
        .catch(function (err) { alert(err.message); });
    } else if (/^video[0-2]$/.test(kind)) {
      var i = Number(kind.slice(5));
      blobPut(kind, file).then(function () { if (urls.videos[i]) URL.revokeObjectURL(urls.videos[i]); urls.videos[i] = URL.createObjectURL(file); render(); })
        .catch(function () { alert('영상을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); });
    }
  }

  var tx = null;
  root.addEventListener('touchstart', function (e) { tx = e.target.closest('#rmedia') ? e.touches[0].clientX : null; }, { passive: true });
  root.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) < 50) return;
    state.motion = (state.motion + (dx < 0 ? 1 : MOTIONS.length - 1)) % MOTIONS.length; save(); render();
  }, { passive: true });

  document.addEventListener('toggle', function (e) { if (e.target && e.target.id === 'cfgd') openCfg = e.target.open; }, true);

  /* ====================== 전체 화면형(쇼츠형) 화면 ====================== */
  var editCat = null, onbShown = false, lastSheet = null;
  var SHEET_HALF = { top: 1, bottom: 1, shoe: 1 };

  function safeEval() {
    try { if (!E.num(state.profile.height)) throw 0; return evaluateAll(); }
    catch (e) { return { results: [], note: '', body: { src: {} } }; }
  }

  function closetTile(it, cat) {
    var sel = state.sel[cat], isSel = sel && sel.id === it.id;
    var chips = it.sizes.map(function (s) {
      return '<button class="chip' + (isSel && sel.size === s.label ? ' on' : '') + '" data-act="pick" data-cat="' + cat + '" data-id="' + it.id + '" data-size="' + h(s.label) + '">' + h(s.label) + '</button>';
    }).join('') + '<button class="chip' + (isSel && !sel.size ? ' on' : '') + '" data-act="pick" data-cat="' + cat + '" data-id="' + it.id + '" data-size="">추천</button>';
    var meta = (cat === 'shoe' ? '' : (it.measureType === 'circ' ? '둘레' : '단면') + ' · ') + (window.FIT_CONFIG.fabric[it.fabric] ? window.FIT_CONFIG.fabric[it.fabric].label : '');
    var img = it.photo ? '<img alt="" src="' + it.photo + '">' : '<svg viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">' + GLYPH[cat] + '</svg>';
    return '<div class="tile' + (isSel ? ' sel' : '') + '"><div class="timg">' + img +
      (it.isRef ? '<span class="tbadge">기준 옷</span>' : '') + (isSel ? '<span class="tcheck">✓</span>' : '') +
      '<span class="tact"><button class="btn sm" data-act="edit" data-id="' + it.id + '" aria-label="수정">수정</button><button class="btn sm danger" data-act="delItem" data-id="' + it.id + '" aria-label="삭제">삭제</button></span></div>' +
      '<div class="tname">' + h(it.name) + '</div>' + (priceText(it.price) ? '<div class="price">' + priceText(it.price) + '</div>' : '') + '<div class="sub">' + meta + '</div><div class="chips">' + chips + '</div>' + buyLink(it, 'buy') + '</div>';
  }

  function sheetInner(ev) {
    if (SHEET_HALF[sheet]) {
      var cat = sheet, list = state.closet.filter(function (x) { return x.cat === cat; });
      var sel = state.sel[cat], it = sel && item(sel.id);
      var cur = ev.results.filter(function (r) { return r.cat === cat; })[0], p = cur && cur.current && cur.current.primary;
      var add = '<button class="tile add" data-act="new" data-cat="' + cat + '"><div class="timg"><span>＋</span></div><div class="tname">새 상품 입력</div><div class="sub">실측표를 보고 입력</div></button>';
      return '<h3>' + CATS[cat] + ' · 내 옷장</h3><div class="hs">' + list.map(function (x) { return closetTile(x, cat); }).join('') + add + '</div>' +
        (it ? '<div class="note">입는 중: ' + h(it.name) + ' · ' + (sel.size ? h(sel.size) : '추천 사이즈') + (p ? ' · <b>' + p.grade + ' ' + sgn(p.ease) + p.unit + '</b>' : '') + '</div>' : '<div class="note">고르지 않으면 이 항목은 입히지 않습니다.</div>') +
        (!E.num(state.profile.height) ? '<div class="warn">핏 결과를 보려면 설정에서 키를 입력해 주세요.</div>' : '') +
        '<div class="acts"><button class="btn" data-act="clearSel" data-cat="' + cat + '">선택 해제</button><button class="btn p" data-act="closeSheet">완료</button></div>';
    }
    if (sheet === 'edit' && state.draft) return viewEditor(state.draft.cat);
    if (sheet === 'detail') {
      var est = Object.keys(ev.body.src).filter(function (k) { return ev.body.src[k] === 'est'; });
      return '<h3>코디 핏 상세</h3>' + (ev.results.length ? ev.results.map(resultCard).join('') : '<div class="empty">상의, 하의, 신발을 고르면 핏 상세가 나옵니다.</div>') +
        (ev.note ? '<div class="rec">' + h(ev.note) + '</div>' : '') +
        (est.length ? '<div class="note">추정값이 사용된 항목이 있습니다. 설정에서 내 치수를 입력하면 더 정확해집니다.</div>' : '') +
        '<div class="note">추정 결과이며 실제 착용감을 보장하지 않습니다.</div><button class="btn" data-act="closeSheet">닫기</button>';
    }
    if (sheet === 'cfg') { openCfg = true; return '<h3>등급 기준 보정</h3>' + cfgPanel() + '<button class="btn" data-act="closeSheet">닫기</button>'; }
    /* settings */
    var av = urls.avatar ? '<img class="uav big" alt="" src="' + urls.avatar + '">' : '<span class="uav big">' + h(String(user.nick).charAt(0)) + '</span>';
    return '<h3>설정</h3>' +
      (!E.num(state.profile.height) ? '<div class="rec">먼저 성별·키·몸무게를 입력해 주세요. 치수는 나중에 여기서 언제든 바꿀 수 있어요.</div>' : '') +
      '<div class="card"><div class="ucard">' + av + '<div><b>' + h(user.nick) + ' 님</b><div class="note">이 기기 안에 저장된 프로필</div></div></div>' +
      '<div class="acts"><button class="btn sm" data-act="logout">프로필 바꾸기</button><button class="btn sm danger" data-act="logout">로그아웃</button></div></div>' +
      '<div class="sec">내 정보 변경</div>' + profileForm() + mediaCard() +
      '<button class="btn" data-act="open" data-name="cfg">등급 기준 보정</button>' +
      '<button class="btn" data-act="sample">예시 데이터 불러오기</button>' +
      '<button class="btn danger" data-act="resetAll">이 프로필 데이터 지우기</button>' +
      '<button class="btn p" data-act="closeSheet">완료</button>';
  }

  function viewMain() {
    var ev = safeEval();
    var segs = MOTIONS.map(function (x, i) { return '<button data-act="motion" data-i="' + i + '" class="' + (state.motion === i ? 'on' : '') + '" aria-label="' + x + '"><i></i><span>' + x + '</span></button>'; }).join('');
    var chips = ev.results.map(function (r) {
      var p = r.current && r.current.primary;
      return '<button class="fchip" data-act="open" data-name="detail"><span class="k">' + CATS[r.cat] + ' · ' + h(r.chosen) + '</span>' +
        (p ? '<span class="grade gk-' + p.gradeKey + '">' + p.grade + ' ' + sgn(p.ease) + p.unit + '</span>' : '') + '</button>';
    }).join('');
    var rail = ['top', 'bottom', 'shoe'].map(function (c) {
      var has = state.sel[c] && item(state.sel[c].id);
      return '<button data-act="open" data-name="' + c + '" class="' + (sheet === c ? 'on' : '') + (has ? ' has' : '') + '" aria-label="' + CATS[c] + '"><svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">' + GLYPH[c] + '</svg><span>' + CATS[c] + '</span></button>';
    }).join('') +
      '<button data-act="open" data-name="detail" class="' + (sheet === 'detail' ? 'on' : '') + '" aria-label="핏 상세">' + IC.list + '<span>상세</span></button>' +
      '<button data-act="open" data-name="settings" class="' + (sheet === 'settings' ? 'on' : '') + '" aria-label="설정">' + IC.gear + '<span>설정</span></button>';
    var sh = '';
    if (sheet) {
      var half = SHEET_HALF[sheet];
      sh = '<div class="sheetbg' + (half ? ' lite' : '') + '" data-act="closeSheet"></div><div class="sheet' + (half ? ' half' : '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + sheetInner(ev) + '</div>';
    }
    return '<div class="reel">' + reelMedia() +
      '<div class="rtop"><div class="rsegs">' + segs + '</div><div class="rbar"><div class="wm">AI FIT</div><span class="rtag">' + h(user.nick) + ' 님</span></div></div>' +
      '<div class="rrail">' + rail + '</div>' +
      '<div class="rcap"><div class="rwho">@' + h(user.nick) + ' · 오늘의 코디</div><div class="fchips">' + (chips || '<span class="fchip">아래 버튼에서 옷을 골라 보세요</span>') + '</div>' +
      (ev.note ? '<div class="rnote">' + h(ev.note) + '</div>' : '') +
      '<div class="rfine">추정 결과이며 실제 착용감을 보장하지 않습니다 · 좌우로 넘겨 동작 바꾸기</div></div>' + sh + '</div>';
  }

  function render() {
    if (!user) {
      root.className = '';
      root.innerHTML = viewLogin();
      loadThumbs();
      var f = lg.mode !== 'list' && root.querySelector('[data-lg]');
      if (f) f.focus();
      return;
    }
    if (sheet === 'edit' && !state.draft) sheet = editCat;
    if (!E.num(state.profile.height) && !onbShown) {
      onbShown = true; sheet = 'settings';
      try { history.pushState({ sh: 'settings' }, ''); } catch (e) {}
    }
    var old = root.querySelector('.sheet'), hs = root.querySelector('.hs');
    var st = old && lastSheet === sheet ? old.scrollTop : 0, sl = hs && lastSheet === sheet ? hs.scrollLeft : 0;
    root.className = 'reelmode';
    root.innerHTML = viewMain();
    lastSheet = sheet;
    var ns = root.querySelector('.sheet'), nh = root.querySelector('.hs');
    if (ns) ns.scrollTop = st;
    if (nh) nh.scrollLeft = sl;
  }

  /* 시트 열기·닫기는 브라우저 기록과 연결해서 뒤로가기가 시트를 한 겹씩 닫게 한다 */
  function openSheet(name) {
    if (sheet === name) return;
    try { history.pushState({ sh: name }, ''); } catch (e) {}
    sheet = name; render();
  }
  window.addEventListener('popstate', function (e) {
    if (!user) { render(); return; }
    sheet = (e.state && e.state.sh) || null;
    if (sheet !== 'edit') state.draft = null;
    render();
  });

  ACT.open = function (el) { openSheet(el.dataset.name); };
  ACT.closeSheet = function () {
    if (history.state && history.state.sh) history.back();
    else { sheet = null; state.draft = null; render(); }
  };
  ACT.pick = function (el) { state.sel[el.dataset.cat] = { id: el.dataset.id, size: el.dataset.size || null }; save(); render(); };
  ACT.clearSel = function (el) { delete state.sel[el.dataset.cat]; save(); render(); };
  var _new = ACT.new, _edit = ACT.edit, _save = ACT.saveDraft, _logout = ACT.logout;
  ACT.new = function (el) { editCat = el.dataset.cat; _new(el); openSheet('edit'); };
  ACT.edit = function (el) { var it = item(el.dataset.id); if (!it) return; editCat = it.cat; _edit(el); openSheet('edit'); };
  ACT.saveDraft = function () { _save(); if (!state.draft) ACT.closeSheet(); };
  ACT.cancelEdit = function () { state.draft = null; ACT.closeSheet(); };
  ACT.logout = function () { onbShown = false; sheet = null; try { history.replaceState({}, ''); } catch (e) {} _logout(); };

  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = ACT[el.dataset.act];
    if (fn) fn(el);
  });

  try { history.replaceState({}, ''); } catch (e) {}
  render();
  loadMedia().then(render);
})();
