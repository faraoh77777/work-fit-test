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
  /* 기본 모델 = 앱에 연결하는 30대 여성 캐릭터. 제작 설정에 숫자가 없어 '중간 키·슬림'을 표준값으로 가정한 것이므로 설정에서 바꿀 수 있다 */
  var MODEL = { gender: 'female', height: '162', weight: '50' };
  function sampleCloset() {
    function sz(label, o) { var r = { label: label }; Object.keys(o).forEach(function (k) { r[k] = String(o[k]); }); return r; }
    return [
      { id: 'p1', cat: 'top', name: '예시 쿠팡 초록 카라 티셔츠', measureType: 'circ', fabric: 'normal', photo: '', price: '13900', url: '', isRef: false, refSize: '', sizes: [
        sz('M', { length: 59, shoulder: 35.5, chest: 88, sleeve: 54 }), sz('L', { length: 60, shoulder: 37, chest: 92, sleeve: 55 }),
        sz('XL', { length: 61, shoulder: 39.5, chest: 96, sleeve: 56 }), sz('2XL', { length: 62, shoulder: 41, chest: 100, sleeve: 57 }),
        sz('3XL', { length: 63, shoulder: 43.5, chest: 104, sleeve: 58 }), sz('4XL', { length: 64, shoulder: 45, chest: 108, sleeve: 59 })] },
      { id: 'p2', cat: 'top', name: '예시 스판 티셔츠', measureType: 'circ', fabric: 'stretch', photo: '', price: '', url: '', isRef: false, refSize: '', sizes: [
        sz('S', { length: 58, shoulder: 36, chest: 82, sleeve: 19 }), sz('M', { length: 60, shoulder: 38, chest: 88, sleeve: 20 }), sz('L', { length: 62, shoulder: 40, chest: 94, sleeve: 21 })] },
      { id: 'p3', cat: 'bottom', name: '예시 슬랙스', measureType: 'flat', fabric: 'normal', photo: '', price: '', url: '', isRef: false, refSize: '', sizes: [
        sz('S', { waist: 34, hip: 45, thigh: 26, rise: 25, inseam: 70 }), sz('M', { waist: 36, hip: 47, thigh: 27, rise: 26, inseam: 72 }), sz('L', { waist: 38, hip: 49, thigh: 28, rise: 27, inseam: 74 })] },
      { id: 'p4', cat: 'shoe', name: '예시 스니커즈', measureType: '', fabric: 'normal', photo: '', price: '', url: '', isRef: false, refSize: '', sizes: [
        { label: '230' }, { label: '235' }, { label: '240' }, { label: '245' }] }
    ];
  }
  var BASE_CFG = JSON.parse(JSON.stringify(window.FIT_CONFIG));
  var E = window.FitEngine;
  var FD = window.FITON || { slogan: '', tabs: [], plans: { free: { name: '무료', limit: 3, price: '', features: [] } }, styles: [] }; /* styles-data.js */

  var LOGO = '<svg viewBox="0 0 34 34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12v-1.5a3 3 0 1 0-3-3"/><path d="M17 12L3.5 22.5Q2 24 4 24.5H30Q32 24 30.5 22.5Z"/></svg>';
  var HERO_BANNER = '<div class="hero"><div class="tx"><span class="pill">FIT CHECK</span><h2>입기 전에,<br>내 사이즈로 먼저 입어보세요</h2><p>쇼핑몰에서 고른 상의, 하의, 신발이 내 몸에 맞는지 실측표로 확인해 드려요.</p></div>' +
    '<svg viewBox="0 0 120 130" aria-hidden="true"><path d="M44 18Q60 30 76 18L98 28L112 52L94 60L90 52V112H30V52L26 60L8 52L22 28Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M44 18Q60 30 76 18" fill="none" stroke="var(--ink)" stroke-width="2"/>' +
    '<g stroke="var(--accent)" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M30 76H90" stroke-dasharray="4 3"/><path d="M30 70v12M90 70v12"/></g>' +
    '<g transform="translate(78 92) rotate(8)"><rect width="30" height="20" rx="4" fill="var(--accent)"/><text x="15" y="14.5" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" font-family="sans-serif">M</text></g></svg></div>';
  var HERO = '<div class="herovid"><video src="assets/hero_v4_5cut.mp4" autoplay muted loop playsinline preload="auto" aria-label="FIT 홍보 영상" onerror="this.parentNode.classList.add(&#39;novid&#39;)"></video>' +
    '<div class="hv-ai">AI 생성 이미지</div>' + HERO_BANNER + '</div>';

  /* ---------- 상태 ---------- */
  function blankState() {
    return { step: 'profile', profile: { gender: 'male', height: '', weight: '', pref: 'fit', m: {} },
      closet: [], sel: {}, draft: null, motion: 0, cfg: null, feel: {}, seq: 1,
      /* FITON: 고른 분류 탭·스타일, 화면(기본 모델/내 아바타), 구독 플랜과 이번 달 입어보기 사용 횟수 */
      styleTab: 'today', styleId: null, view: 'model', sub: { plan: 'free', used: 0, month: '' } };
  }
  /* 둘러보기 중 보던 분류·스타일을 로그인 뒤에도 이어서 보여 준다 */
  function pickKeep() { return { tab: state.styleTab, id: state.styleId }; }
  function applyKeep(k) { if (k && k.id) { state.styleTab = k.tab; state.styleId = k.id; state.view = 'model'; } }
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
  var urls = { avatar: null, videos: [null, null, null], tryon: {} };
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
    Object.keys(urls.tryon).forEach(function (k) { if (urls.tryon[k]) URL.revokeObjectURL(urls.tryon[k]); });
    urls = { avatar: null, videos: [null, null, null], tryon: {} };
  }
  function loadMedia() {
    if (!user) return Promise.resolve();
    var uid = user.id;
    var ids = state.closet.map(function (x) { return x.id; });
    return Promise.all(MEDIA_KEYS.map(blobGet).concat(ids.map(function (id) { return blobGet('tryon:' + id); }))).then(function (r) {
      if (!user || user.id !== uid) return;
      clearUrls();
      if (r[0]) urls.avatar = URL.createObjectURL(r[0]);
      for (var i = 0; i < 3; i++) if (r[i + 1]) urls.videos[i] = URL.createObjectURL(r[i + 1]);
      ids.forEach(function (id, j) { var b = r[4 + j]; if (b) urls.tryon[id] = URL.createObjectURL(b); });
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
  function blankLogin() { return { mode: 'list', id: null, nick: '', pin: '', pin2: '', gender: MODEL.gender, height: MODEL.height, weight: MODEL.weight, err: '', avatar: null, avatarUrl: null, fails: 0, until: 0 }; }
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
    var bar = '<div class="bar"><div class="brand">' + '<button class="backbtn" data-act="' + (lg.mode !== 'list' ? 'lgBack' : 'lgClose') + '" aria-label="' + (lg.mode !== 'list' ? '이전 화면' : '둘러보기로 돌아가기') + '">←</button>' + LOGO + '<div class="wm">FITON<i></i></div>' + (lg.mode === 'list' ? '<button class="newprof" data-act="lgNew">새 프로필 만들기</button>' : '') + '</div></div>';
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
        '<div><div class="note">탑뷰 등 다른 곳에서 만든 내 아바타 이미지(정면 전신)를 올려 주세요. 동작 영상은 로그인 후 내 정보에서 연결할 수 있어요.</div>' +
        '<label class="btn sm" style="cursor:pointer;margin-top:6px;display:inline-block">이미지 선택<input type="file" accept="image/*" data-file="lgAvatar" hidden></label></div></div>' +
        (!users.length && hasLegacy() ? '<div class="note">이 기기에 전에 입력한 정보가 있어 첫 프로필로 옮겨집니다.</div>' : '') + err;
      foot = (users.length ? '<button class="btn ghost" data-act="lgBack">취소</button>' : '') + '<button class="btn p" data-act="lgCreate">만들고 시작하기</button>';
    } else {
      body = HERO + '<div class="sec">' + (users.length ? '프로필 선택' : '시작하기') + '</div>' +
        (users.length ? '<div class="ulist">' + users.map(function (x) {
          return '<div class="urow"><button class="ugo" data-act="lgPick" data-id="' + h(x.id) + '">' + avatarDot(x) + '<b>' + h(x.nick) + '</b></button>' +
            '<button class="btn sm danger" data-act="lgDel" data-id="' + h(x.id) + '" aria-label="' + h(x.nick) + ' 삭제">삭제</button></div>';
        }).join('') + '</div>' : '<div class="note">닉네임과 PIN으로 프로필을 만들면, 입력한 내 정보와 아바타를 다음에 그대로 불러옵니다.</div>') +
        '<div class="note">쇼츠에서 본 스타일 보기 → 내 아바타로 입어보기 → 쿠팡·네이버에서 바로 구매. 핏온(FITON)은 보는 건 무료, 내게 입혀 보는 건 구독이에요.</div>' +
        '<div class="note">프로필과 데이터는 이 기기(브라우저) 안에만 저장되며 서버로 보내지 않습니다. PIN은 같은 기기를 함께 쓸 때 서로 구분하는 잠금입니다.</div>';
      foot = '';
    }
    return bar + '<div class="body">' + body + '</div>' + (foot ? '<div class="foot">' + foot + '</div>' : '');
  }
  /* 프로필 화면(새 프로필·PIN)으로 갈 때 브라우저 기록을 남겨서 뒤로가기가 처음 화면으로 돌아오게 한다 */
  function lgGo(fn) { fn(); try { history.pushState({ lg: 1 }, ''); } catch (e) {} render(); }
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
    resetLogin(); lg.fails = 0; lg.until = 0; sheet = null; clean = false; lgOpen = false; /* 프로필 만들기·로그인 직후에는 '탭하세요' 화면 없이 바로 메뉴가 보이게 */
    clearUrls(); render(); window.scrollTo(0, 0);
    try { history.replaceState({ s: state.step }, ''); } catch (e) {}
    loadMedia().then(function () { render(); genResume(); });
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
    var keep = pickKeep();
    user = u;
    var info = { gender: lg.gender, height: lg.height, weight: lg.weight }, av = lg.avatar;
    (first ? migrateLegacy() : Promise.resolve(null)).then(function (old) {
      state = old || blankState(); applyKeep(keep);
      state.profile.gender = info.gender;
      if (info.height !== '') state.profile.height = info.height;
      if (info.weight !== '') state.profile.weight = info.weight;
      state.step = 'profile';
      if (!state.closet.length) { state.closet = sampleCloset(); state.seq = 10; }
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
    var keep = pickKeep();
    user = u; state = load(); applyKeep(keep); enterApp();
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
      '<div class="sec" id="sec-body">내 신체 사이즈 11가지 (치수는 비워 두면 키·몸무게로 추정)</div><div>' +
      '<div class="mrow"><span>키</span><div class="inwrap"><input type="number" inputmode="decimal" id="in-height" data-path="profile.height" data-hint="1" value="' + h(p.height) + '" aria-label="키"><small>cm</small></div><span></span></div>' +
      '<div class="mrow"><span>몸무게</span><div class="inwrap"><input type="number" inputmode="decimal" id="in-weight" data-path="profile.weight" data-hint="1" value="' + h(p.weight) + '" aria-label="몸무게"><small>kg</small></div><span></span></div>' +
      rows + '</div>' +
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
  /* 사이즈표 캡처 → 실측표 자동 입력, 이어서 상품 사진 캡처 */
  var ocr = { busy: false, msg: '', ok: false };
  function captureCards(d) {
    var st = ocr.busy ? '<span class="tag">읽는 중</span>' : (ocr.msg ? '<span class="tag' + (ocr.ok ? ' real' : '') + '">' + (ocr.ok ? '읽음' : '확인 필요') + '</span>' : '');
    return '<div class="card"><div class="h"><span>① 사이즈표 캡처</span>' + st + '</div>' +
      '<div class="note">쿠팡 상품 페이지의 사이즈표(실측표)를 캡처해서 올리면 아래 실측표를 자동으로 채웁니다. 인식이 틀릴 수 있으니 꼭 확인해 주세요.</div>' +
      '<label class="btn sm" style="cursor:pointer;align-self:flex-start">' + (ocr.busy ? '읽는 중…' : '사이즈표 사진 선택') + '<input type="file" accept="image/*" data-file="sizeCap" hidden' + (ocr.busy ? ' disabled' : '') + '></label>' +
      (ocr.msg ? '<div data-ocrmsg class="' + (ocr.ok ? 'note' : 'warn') + '">' + h(ocr.msg) + '</div>' : '') + '</div>' +
      '<div class="card"><div class="h"><span>② 상품 사진 캡처</span>' + (d.photo ? '<span class="tag real">등록됨</span>' : '') + '</div>' +
      '<div class="photo">' + (d.photo ? '<img alt="상품 사진" src="' + d.photo + '">' : '상품 사진 (선택, 참고용)') + '</div>' +
      '<label class="btn sm" style="cursor:pointer;align-self:flex-start">상품 사진 선택<input type="file" accept="image/*" data-file="draftPhoto" hidden></label></div>';
  }
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
    return '<div class="body"><div class="sec">' + CATS[cat] + ' ' + (d.id ? '수정' : '새 상품') + '</div>' + captureCards(d) +
      '<label class="f">상품 이름<input type="text" data-path="draft.name" value="' + h(d.name) + '" placeholder="예) 스판 라운드 티셔츠"></label>' +
      '<label class="f">가격 (원, 선택)<input type="number" inputmode="numeric" min="0" data-path="draft.price" value="' + h(d.price == null ? '' : d.price) + '" placeholder="예) 39000"></label>' +
      '<label class="f">상품 링크 (선택)<input type="url" data-path="draft.url" value="' + h(d.url || '') + '" placeholder="https://..."></label>' +
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

  /* 고른 옷(상의→하의→신발 순) 중 '입은 모습' 이미지가 연결된 첫 번째 */
  function hasMotionVideo() { return urls.videos.some(Boolean); }
  function wornImage() {
    var c = ['top', 'bottom', 'shoe'];
    for (var i = 0; i < c.length; i++) {
      var s = state.sel[c[i]], it = s && item(s.id);
      if (it && urls.tryon[it.id]) return { cat: c[i], name: it.name, url: urls.tryon[it.id] };
    }
    return null;
  }
  function reelMedia() {
    var m = state.motion, inner, badge = '', worn = wornImage(), st = curStyle();
    /* 스타일을 보는 중이고 '기본 모델' 화면이면 무료용 기본 AI 모델 착용 이미지, '내 아바타' 화면이면 내가 입혀 본 모습 */
    if (st && st.modelImage && state.view !== 'me') { inner = '<img class="worn model" alt="' + h(st.title) + ' 기본 모델 착용" src="' + h(st.modelImage) + '">'; badge = '기본 모델 착용 · AI 생성 이미지'; }
    else if (worn) { inner = '<img class="worn" alt="' + h(worn.name) + ' 입은 모습" src="' + worn.url + '">'; badge = CATS[worn.cat] + ' · ' + worn.name + ' 입은 모습'; }
    else if (urls.videos[m]) inner = '<video src="' + urls.videos[m] + '" loop playsinline autoplay muted></video>';
    else if (urls.avatar) { inner = '<img alt="내 아바타" src="' + urls.avatar + '">'; badge = '이 동작의 영상이 없어 이미지를 표시합니다'; }
    else {
      inner = '<svg viewBox="0 0 120 260" role="img" aria-label="아바타 자리 표시"><circle cx="60" cy="26" r="17" fill="var(--skin)"/><rect x="54" y="40" width="12" height="10" fill="var(--skin)"/>' +
        '<path d="M30 56 Q60 46 90 56 L96 120 L82 124 L80 100 L80 150 L40 150 L40 100 L38 124 L24 120 Z" fill="rgba(20,20,20,.08)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M41 150 L79 150 L82 226 L66 226 L60 170 L54 226 L38 226 Z" fill="rgba(20,20,20,.14)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      badge = '설정에서 아바타를 연결하면 여기에 표시됩니다';
    }
    reelBadge = badge; /* 배지는 얼굴을 가리지 않게 하단 스타일 카드 바로 위(rcap)에 표시 */
    return '<div class="rmedia" id="rmedia">' + inner + '</div>';
  }
  var reelBadge = '';
  var IC = {
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/></svg>',
    avatar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="4"/><path d="M3 21v-1a7 7 0 0 1 11-5.7"/><path d="M19 15v6M16 18h6"/></svg>'
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
    lgNew: function () { lgGo(function () { resetLogin('new'); }); },
    lgPick: function (el) { lgGo(function () { resetLogin('pin', el.dataset.id); }); },
    lgDel: function (el) { lgGo(function () { resetLogin('del', el.dataset.id); }); },
    lgBack: function () { if (history.state && history.state.lg) history.back(); else { resetLogin(); render(); } },
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
      dropTryon(it.id);
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
      state.closet.forEach(function (x) { dropTryon(x.id); });
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

  function dropTryon(id) {
    if (urls.tryon[id]) URL.revokeObjectURL(urls.tryon[id]);
    delete urls.tryon[id];
    blobDel('tryon:' + id).catch(function () {});
  }
  function handleFile(kind, file) {
    if (kind === 'lgAvatar') {
      shrink(file, 1000, 0.92).then(function (b) { if (lg.avatarUrl) URL.revokeObjectURL(lg.avatarUrl); lg.avatar = b; lg.avatarUrl = URL.createObjectURL(b); render(); })
        .catch(function (err) { alert(err.message); });
    } else if (kind.indexOf('tryon:') === 0) {
      var tid = kind.slice(6);
      if (!item(tid)) return;
      shrink(file, 1400, 0.9).then(function (b) { return blobPut(kind, b).then(function () { if (urls.tryon[tid]) URL.revokeObjectURL(urls.tryon[tid]); urls.tryon[tid] = URL.createObjectURL(b); render(); }); })
        .catch(function () { alert('입은 모습 이미지를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.'); });
    } else if (kind === 'sizeCap') {
      var d0 = state.draft;
      if (!d0 || !window.SizeOcr) return;
      ocr = { busy: true, msg: '글자를 읽는 중입니다. 처음에는 인식 데이터를 내려받느라 1분 가까이 걸릴 수 있어요.', ok: false }; render();
      SizeOcr.recognize(file, function (stt, p) {
        if (p != null && ocr.busy) { ocr.msg = '글자를 읽는 중… ' + Math.round(p * 100) + '%'; var el = root.querySelector('[data-ocrmsg]'); if (el) el.textContent = ocr.msg; }
      }).then(function (text) {
        var d = state.draft;
        if (!d || d !== d0 && d.cat !== d0.cat) { ocr = { busy: false, msg: '', ok: false }; return; }
        var r = SizeOcr.parse(text, d.cat);
        if (!r.sizes.length) { ocr = { busy: false, msg: '사이즈표를 읽지 못했습니다. 글자가 크고 또렷하게 다시 캡처하거나, 아래 표에 직접 입력해 주세요.', ok: false }; render(); return; }
        d.sizes = r.sizes;
        if (r.circ) d.measureType = 'circ';
        if (d.isRef && !d.sizes.some(function (s) { return s.label === d.refSize; })) d.refSize = d.sizes[0].label;
        save();
        var bad = r.bad || [];
        ocr = { busy: false, msg: '사이즈 ' + r.sizes.length + '개' + (d.cat === 'shoe' ? '를 읽었습니다.' : ', 항목 ' + r.found + '개를 채웠습니다.') + ' 아래 표 값이 캡처와 같은지 꼭 확인해 주세요.' +
          (bad.length ? ' 특히 의심되는 칸: ' + bad.join(', ') + ' (사이즈가 커지는데 값이 어긋남). 표 부분만 크게 캡처하면 더 정확해집니다.' : ''), ok: !bad.length };
        render();
      }).catch(function (err) { ocr = { busy: false, msg: err.message || '글자를 읽지 못했습니다.', ok: false }; render(); });
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
    if (Math.abs(dx) < 50 || !hasMotionVideo()) return; /* 동작 영상이 없으면 넘겨도 바뀌는 게 없다 */
    state.motion = (state.motion + (dx < 0 ? 1 : MOTIONS.length - 1)) % MOTIONS.length; save(); render();
  }, { passive: true });

  /* PC: 마우스 드래그도 모바일 스와이프와 똑같이 동작(드래그 뒤 따라오는 클릭은 전체화면 열기로 이어지지 않게 막는다) */
  var mx = null, mdrag = false;
  root.addEventListener('mousedown', function (e) { mx = e.button === 0 && e.target.closest('#rmedia') ? e.clientX : null; mdrag = false; });
  document.addEventListener('mouseup', function (e) {
    if (mx === null) return;
    var dx = e.clientX - mx; mx = null;
    if (Math.abs(dx) < 50 || !hasMotionVideo()) return;
    mdrag = true;
    state.motion = (state.motion + (dx < 0 ? 1 : MOTIONS.length - 1)) % MOTIONS.length; save(); render();
  });
  root.addEventListener('click', function (e) { if (mdrag) { mdrag = false; e.stopPropagation(); e.preventDefault(); } }, true);

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
      '<div class="tname">' + h(it.name) + '</div>' + (priceText(it.price) ? '<div class="price">' + priceText(it.price) + '</div>' : '') + '<div class="sub">' + meta + '</div><div class="chips">' + chips + '</div>' + tryonRow(it) + buyLink(it, 'buy') + '</div>';
  }

  /* ---- 입혀 보기(AI): Supabase Edge Function 이 기본 캐릭터 + 상품 사진으로 입은 모습을 만든다 ---- */
  var genPending = null;                       /* 만드는 중인 옷 id (한 번에 하나만) */
  var GEN_KEY = function () { return 'fit-gen-pending:' + (user ? user.id : ''); };
  function deviceId() {
    try {
      var d = localStorage.getItem('fit-device');
      if (!d) { d = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); localStorage.setItem('fit-device', d); }
      return d;
    } catch (e) { return 'tmp' + Math.random().toString(16).slice(2) + Date.now().toString(16); }
  }
  function isMale() { return !!(state && state.profile && state.profile.gender === 'male'); }
  function genEnabled() { var c = window.TRYON_CFG; return !!(c && c.enabled && c.url && c.anon); }
  function genCall(body) {
    var c = window.TRYON_CFG;
    return fetch(c.url.replace(/\/$/, '') + '/functions/v1/tryon', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.anon, Authorization: 'Bearer ' + c.anon }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg; document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4500);
  }
  function genButton(it) {
    if (!genEnabled() || !it.photo) return '';
    if (genPending === it.id) return '<button class="btn sm" disabled>만드는 중… 다른 걸 해도 돼요</button>';
    return '<button class="btn sm p" data-act="genTryon" data-id="' + it.id + '"' + (genPending ? ' disabled' : '') + '>' + (urls.tryon[it.id] ? 'AI로 다시 입히기' : 'AI로 입혀 보기') + '</button>';
  }
  function genFinish(id, ok, msg) {
    genPending = null;
    try { localStorage.removeItem(GEN_KEY()); } catch (e) {}
    if (ok) {
      var it0 = item(id);
      if (it0) { var cur0 = state.sel[it0.cat]; state.sel[it0.cat] = { id: id, size: cur0 && cur0.id === id ? cur0.size : null }; }
      state.view = 'me'; save(); /* 완성되면 '내 아바타' 화면으로 */
    }
    waitEnd(ok);
    if (msg) toast(msg);
    render();
  }
  /* 4초마다 결과를 확인한다. 화면을 닫았다 열어도 이어서 확인한다 */
  function genPoll(id, taskId, t0) {
    if (!user || genPending !== id) return;
    if (Date.now() - t0 > 6 * 60 * 1000) { genFinish(id, false, '입은 모습을 만드는 데 너무 오래 걸려 중단했어요. 나중에 다시 시도해 주세요.'); return; }
    genCall({ action: 'status', taskId: taskId }).then(function (res) {
      if (!res.ok) throw new Error('retry');
      var j = res.j;
      if (j.status === 'success' && j.image) {
        var bin = atob(j.image), u = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        var blob = new Blob([u], { type: j.mime || 'image/png' });
        return blobPut('tryon:' + id, blob).then(function () {
          if (urls.tryon[id]) URL.revokeObjectURL(urls.tryon[id]);
          urls.tryon[id] = URL.createObjectURL(blob);
          state.aiGen = state.aiGen || {}; state.aiGen[id] = true; save();
          var it = item(id);
          genFinish(id, true, (it ? it.name : '옷') + ' 입은 모습이 완성됐어요!');
        });
      }
      if (j.status === 'failed') { genFinish(id, false, '입은 모습을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.'); return; }
      setTimeout(function () { genPoll(id, taskId, t0); }, 4000);
    }).catch(function () { setTimeout(function () { genPoll(id, taskId, t0); }, 6000); });
  }
  /* 상품 사진은 서버가 data URL(base64)만 받는다. 스타일 데이터의 사진은 파일 경로라 먼저 읽어서 바꾼다 */
  function photoData(it) {
    var p = String(it.photo || '');
    if (/^data:/i.test(p)) return Promise.resolve(p);
    return fetch(p).then(function (r) { if (!r.ok) throw new Error('상품 사진을 불러오지 못했습니다.'); return r.blob(); }).then(blobToDataUrl);
  }
  ACT.genTryon = function (el) {
    var it = item(el.dataset.id);
    if (!it || genPending || !genEnabled()) return;
    if (!it.photo) { alert('먼저 이 옷의 상품 사진을 올려 주세요. (수정 → 상품 사진)'); return; }
    if (tryLeft() <= 0) { toast('이번 달 입어보기 횟수를 다 썼어요. 플랜을 확인해 주세요.'); openSheet('plan'); return; }
    var first = false;
    try { first = !localStorage.getItem('fit-gen-ok'); } catch (e) { first = true; }
    if (first && !confirm('이 옷의 상품 사진이 AI 이미지 생성 서버(Supabase·TopView)로 전송되어 입은 모습을 만듭니다. 내 얼굴 사진과 몸 정보는 전송되지 않아요. 만들어진 이미지는 AI가 생성한 것이라 실제 상품과 다를 수 있고, 플랜별 월 횟수와 하루 이용 한도가 있습니다. 계속할까요?')) return;
    if (urls.tryon[it.id] && !confirm('이미 만든 입은 모습이 있습니다. 다시 만들면 입어보기 횟수가 한 번 더 쓰입니다. (남은 ' + tryLeft() + '회) 계속할까요?')) return;
    try { localStorage.setItem('fit-gen-ok', '1'); } catch (e) {}
    var id = it.id;
    genPending = id; sheet = null; state.draft = null; render(); waitStart(it.name);
    photoData(it).then(function (g) {
      return genCall({ device: deviceId(), cat: it.cat, garment: g, gender: isMale() ? 'male' : 'female' });
    }).then(function (res) {
      if (!res.ok || !res.j.taskId) throw new Error((res.j && res.j.error) || '요청을 접수하지 못했습니다.');
      tryUse(); /* 서버가 접수한 뒤에만 이번 달 횟수를 뺀다(거절되면 차감 없음) */
      var t0 = Date.now();
      try { localStorage.setItem(GEN_KEY(), JSON.stringify({ id: id, taskId: res.j.taskId, t0: t0 })); } catch (e) {}
      genPoll(id, res.j.taskId, t0);
    }).catch(function (err) { genFinish(id, false, (err && err.message) || '요청을 접수하지 못했습니다.'); });
  };
  function genResume() {
    if (!user || genPending || !genEnabled()) return;
    try {
      var p = JSON.parse(localStorage.getItem(GEN_KEY()) || 'null');
      if (p && p.id && p.taskId && item(p.id) && Date.now() - p.t0 < 6 * 60 * 1000) { genPending = p.id; render(); waitStart((item(p.id) || {}).name || ''); genPoll(p.id, p.taskId, p.t0); }
      else if (p) localStorage.removeItem(GEN_KEY());
    } catch (e) {}
  }
  /* ---- 피팅룸 대기 연출: 커튼이 닫히고 문구가 바뀌며 진행 막대가 찬다. 닫고 다른 옷을 봐도 되고, 끝나면 커튼이 열린다 ---- */
  var WAIT_MSGS = ['치수 확인 중', '옷을 고르는 중', '피팅룸에 들어가는 중', '옷 입는 중', '거울 앞에 서는 중', '마무리하는 중'];
  var waitT = null, waitP = null, waitStep = 0, waitName = '';
  function waitStart(name) {
    waitEnd(false, true);
    waitName = name || ''; waitStep = 0;
    var o = document.createElement('div'); o.id = 'fwait';
    o.innerHTML = '<div class="fcl"></div><div class="fcr"></div><div class="fbody"><div class="fsign">FITTING ROOM</div>' +
      '<div class="fmsg" id="fmsg">' + h(WAIT_MSGS[0]) + '<i>.</i><i>.</i><i>.</i></div><div class="fname">' + h(waitName) + '</div>' +
      '<div class="fbar"><b id="fbar"></b></div><div class="fhint">보통 1~2분 걸려요. 닫고 다른 옷을 봐도 됩니다.</div>' +
      '<button type="button" class="fbtn" id="fclose">닫고 계속 보기</button></div>';
    document.body.appendChild(o);
    requestAnimationFrame(function () { requestAnimationFrame(function () { o.classList.add('shut'); }); });
    o.querySelector('#fclose').addEventListener('click', function () { o.classList.add('hide'); });
    var t0 = Date.now();
    waitT = setInterval(function () {
      var s = Math.min(WAIT_MSGS.length - 1, Math.floor((Date.now() - t0) / 14000));
      var m = document.getElementById('fmsg');
      if (m && s !== waitStep) { waitStep = s; m.firstChild.nodeValue = WAIT_MSGS[s]; }
      var p = 90 * (1 - Math.exp(-(Date.now() - t0) / 40000));  /* 처음엔 빨리, 90% 근처에서 천천히 */
      var bar = document.getElementById('fbar'); if (bar) bar.style.width = p.toFixed(1) + '%';
    }, 500);
  }
  function waitEnd(ok, quick) {
    if (waitT) { clearInterval(waitT); waitT = null; }
    var o = document.getElementById('fwait'); if (!o) return;
    if (quick) { o.remove(); return; }
    var bar = document.getElementById('fbar'); if (bar && ok) bar.style.width = '100%';
    o.classList.remove('hide');
    setTimeout(function () { o.classList.remove('shut'); o.classList.add('opening'); setTimeout(function () { o.remove(); }, 1300); }, ok ? 500 : 0);
  }
  function tryonRow(it) {
    var has = !!urls.tryon[it.id];
    return '<div class="tryon">' + genButton(it) + '<label class="btn sm" style="cursor:pointer">' + (has ? '입은 모습 바꾸기' : '입은 모습 올리기') + '<input type="file" accept="image/*" data-file="tryon:' + it.id + '" hidden></label>' +
      (has ? '<button class="btn sm danger" data-act="clearTryon" data-id="' + it.id + '">삭제</button>' : '') + '</div>';
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
    if (sheet === 'avatar') return viewAvatarSheet();
    if (sheet === 'plan') return viewPlanSheet();
    /* settings */
    var av = urls.avatar ? '<img class="uav big" alt="" src="' + urls.avatar + '">' : '<span class="uav big">' + h(String(user.nick).charAt(0)) + '</span>';
    return '<h3>설정</h3>' +
      (!E.num(state.profile.height) ? '<div class="rec">먼저 성별·키·몸무게를 입력해 주세요. 치수는 나중에 여기서 언제든 바꿀 수 있어요.</div>' : '') +
      '<div class="card"><div class="ucard">' + av + '<div><b>' + h(user.nick) + ' 님</b><div class="note">이 기기 안에 저장된 프로필</div></div></div>' +
      '<div class="acts"><button class="btn sm" data-act="switchUser">프로필 바꾸기</button><button class="btn sm danger" data-act="logout">로그아웃</button></div></div>' +
      subCard() +
      '<div class="sec">내 정보 변경</div>' + profileForm() + mediaCard() +
      '<button class="btn" data-act="open" data-name="cfg">등급 기준 보정</button>' +
      '<button class="btn" data-act="sample">기본 모델 + 예시 옷으로 맞추기</button>' +
      '<button class="btn danger" data-act="resetAll">이 프로필 데이터 지우기</button>' +
      '<button class="btn p" data-act="closeSheet">완료</button>';
  }

  function viewMain() {
    ensureStyle();
    var ev = safeEval();
    var segs = !hasMotionVideo() ? '' : MOTIONS.map(function (x, i) { return '<button data-act="motion" data-i="' + i + '" class="' + (state.motion === i ? 'on' : '') + '" aria-label="' + x + '"><i></i><span>' + x + '</span></button>'; }).join('');
    var rail = ['top', 'bottom', 'shoe'].map(function (c) {
      var has = state.sel[c] && item(state.sel[c].id);
      return '<button data-act="open" data-name="' + c + '" class="' + (sheet === c ? 'on' : '') + (has ? ' has' : '') + '" aria-label="' + CATS[c] + '"><svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">' + GLYPH[c] + '</svg><span>' + CATS[c] + '</span></button>';
    }).join('') +
      '<button data-act="open" data-name="detail" class="' + (sheet === 'detail' ? 'on' : '') + '" aria-label="핏 상세">' + IC.list + '<span>상세</span></button>' +
      '<button data-act="bodyInput" class="' + (sheet === 'settings' ? 'on' : '') + '" aria-label="내 치수 입력">' + IC.ruler + '<span>치수</span></button>' +
      '<button data-act="open" data-name="settings" class="' + (sheet === 'settings' ? 'on' : '') + '" aria-label="설정">' + IC.gear + '<span>설정</span></button>';
    var sh = '';
    if (sheet) {
      var half = SHEET_HALF[sheet];
      sh = '<div class="sheetbg' + (half ? ' lite' : '') + '" data-act="closeSheet"></div><div class="sheet' + (half ? ' half' : '') + '" role="dialog" aria-modal="true"><div class="grab"></div>' + sheetInner(ev) + '</div>';
    }
    return '<div class="reel">' + reelMedia() +
      '<div class="rtop"><div class="rsegs">' + segs + '</div><div class="rbar"><div class="wm">FITON</div>' + (user ? '<span class="rtag">' + h(user.nick) + ' 님</span>' : '<button type="button" class="rtag" data-act="lgOpen">로그인</button>') + '</div></div>' +
      '<div class="rrail">' + rail + '</div>' +
      '<div class="rcap">' + styleTabs() + (reelBadge ? '<span class="rbadge">' + h(reelBadge) + '</span>' : '') + styleCard() +
      '</div>' + fab() + sh + '</div>';
  }

  var clean = !!user; /* 로그인 상태로 처음 접속하면 영상만 꽉 차게 보이고, 화면을 탭하면 메뉴가 나타난다. 둘러보기(프로필 없음)는 메뉴가 바로 보인다 */
  var lgOpen = false; /* 프로필 없이 둘러보는 중에 로그인·프로필 화면을 열었는지 */
  function render() {
    if (!user && lgOpen) {
      root.className = lg.mode === 'list' ? 'lgfull' : '';
      root.innerHTML = viewLogin();
      loadThumbs();
      var f = lg.mode !== 'list' && root.querySelector('[data-lg]');
      if (f) f.focus();
      return;
    }
    if (!user) sheet = null; /* 둘러보기에서는 시트를 열지 않는다(내 체형·아바타 기능은 로그인 뒤) */
    if (sheet === 'edit' && !state.draft) sheet = editCat;
    if (user && !E.num(state.profile.height) && !onbShown) {
      onbShown = true; sheet = 'settings';
      try { history.pushState({ sh: 'settings' }, ''); } catch (e) {}
    }
    var old = root.querySelector('.sheet'), hs = root.querySelector('.hs');
    var st = old && lastSheet === sheet ? old.scrollTop : 0, sl = hs && lastSheet === sheet ? hs.scrollLeft : 0;
    if (sheet) clean = false;
    root.className = 'reelmode' + (clean ? ' clean' : '') + (user ? '' : ' guest');
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
    if (!user) { lgOpen = !!(e.state && (e.state.lgo || e.state.lg)); resetLogin(); render(); return; }
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
  ACT.clearTryon = function (el) { dropTryon(el.dataset.id); render(); };
  ACT.sample = function () {
    if ((state.closet.length || state.profile.height) && !confirm('내 정보와 옷장이 기본 모델(여성 ' + MODEL.height + 'cm/' + MODEL.weight + 'kg)과 예시 옷으로 바뀝니다. 계속할까요?')) return;
    state.closet.forEach(function (x) { dropTryon(x.id); });
    state.profile = { gender: MODEL.gender, height: MODEL.height, weight: MODEL.weight, pref: 'fit', m: {} };
    state.closet = sampleCloset(); state.sel = {}; state.seq = 10; state.feel = {}; state.draft = null;
    save(); render();
  };
  ACT.clearSel = function (el) { delete state.sel[el.dataset.cat]; save(); render(); };
  var _new = ACT.new, _edit = ACT.edit, _save = ACT.saveDraft, _logout = ACT.logout;
  ACT.new = function (el) { editCat = el.dataset.cat; ocr = { busy: false, msg: '', ok: false }; _new(el); openSheet('edit'); };
  ACT.edit = function (el) { var it = item(el.dataset.id); if (!it) return; editCat = it.cat; ocr = { busy: false, msg: '', ok: false }; _edit(el); openSheet('edit'); };
  ACT.saveDraft = function () { _save(); if (!state.draft) ACT.closeSheet(); };
  ACT.cancelEdit = function () { state.draft = null; ACT.closeSheet(); };
  ACT.logout = function () { onbShown = false; sheet = null; try { history.replaceState({}, ''); } catch (e) {} _logout(); };

  /* ====================== FITON: 스타일 카드 · 아바타 만들기 · 구독 횟수 (데이터는 styles-data.js) ====================== */
  function monthKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  /* 구독 상태는 항상 이 함수로 읽는다: 이전 저장본에 없을 수 있고, 달이 바뀌면 사용 횟수를 0으로 되돌린다 */
  function subNow() {
    var s = state.sub;
    if (!s || typeof s !== 'object') s = state.sub = { plan: 'free', used: 0, month: '' };
    if (!FD.plans[s.plan]) s.plan = 'free';
    if (s.month !== monthKey()) { s.month = monthKey(); s.used = 0; }
    s.used = Number(s.used) || 0;
    return s;
  }
  function planNow() { return FD.plans[subNow().plan]; }
  function tryLeft() { return Math.max(0, planNow().limit - subNow().used); }
  function tryUse() { subNow().used++; save(); }
  function stylesIn(tab) { return FD.styles.filter(function (s) { return tab === 'today' || (s.tags || []).indexOf(tab) >= 0; }); }
  function curStyle() { return FD.styles.filter(function (s) { return s.id === state.styleId; })[0] || null; }
  function ensureStyle() {
    if (!FD.tabs.some(function (t) { return t.key === state.styleTab; })) state.styleTab = 'today';
    var list = stylesIn(state.styleTab), cur = curStyle();
    if (!cur || list.indexOf(cur) < 0) state.styleId = list.length ? list[0].id : null;
  }
  function styleItemId(st, cat) { return 's_' + st.id + '_' + cat; }
  /* 스타일의 상의/하의/신발을 옷장에 넣고(이미 있으면 그대로) 코디로 고른다 → 기존 옷장·핏 판정 흐름에 그대로 연결된다 */
  function importStyle(st) {
    ['top', 'bottom', 'shoe'].forEach(function (cat) {
      var src = st.items && st.items[cat];
      if (!src) { delete state.sel[cat]; return; }
      var id = styleItemId(st, cat);
      if (!item(id)) {
        var rec = JSON.parse(JSON.stringify(src));
        rec.id = id; rec.cat = cat; rec.isRef = false; rec.refSize = '';
        if (!rec.photo) rec.photo = st.modelImage || '';
        rec.sizes = (rec.sizes || []).map(function (s) { var r = {}; Object.keys(s).forEach(function (k) { r[k] = String(s[k]); }); return r; });
        state.closet.push(rec);
      }
      var cur = state.sel[cat];
      if (!cur || cur.id !== id) state.sel[cat] = { id: id, size: null };
    });
    save();
  }
  function styleApplied(st) {
    return ['top', 'bottom', 'shoe'].every(function (cat) {
      var src = st.items && st.items[cat], s = state.sel[cat];
      return src ? !!(s && s.id === styleItemId(st, cat)) : !s;
    });
  }
  function styleTabs() {
    return '<div class="stabs">' + FD.tabs.map(function (t) {
      return '<button type="button" class="' + (state.styleTab === t.key ? 'on' : '') + '" data-act="styleTab" data-tab="' + h(t.key) + '">' + h(t.label) + '</button>';
    }).join('') + '</div>';
  }
  function shopBtn(st, shop) {
    var u = safeUrl(st[shop + 'Url']), label = shop === 'coupang' ? '쿠팡에서 보기' : '네이버에서 보기';
    return u ? '<a class="sbtn ' + shop + '" href="' + h(u) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'
      : '<button type="button" class="sbtn off" data-act="noLink">' + label + '</button>';
  }
  /* 코디 카드 설명: 모델이 입고 있는 옷 이름과 사이즈(styles-data 의 worn)를 그대로 보여 준다. 선택하는 곳이 아님 */
  function pointsHtml(st) {
    var pts = st.points || '', k = pts.indexOf('. '), head = k < 0 ? pts : pts.slice(0, k), tail = k < 0 ? '' : pts.slice(k + 2);
    return h(st.worn || head) + (tail ? '<br>' + h(tail) : '');
  }
  function styleCard() {
    var st = curStyle();
    if (!st) return '<div class="scard"><div class="sp">이 분류에 등록된 스타일이 없습니다.</div></div>';
    var list = stylesIn(state.styleTab), i = list.indexOf(st), n = list.length, me = state.view === 'me';
    return '<div class="scard">' +
      '<div class="sh"><button type="button" data-act="styleNext" data-d="-1" aria-label="이전 스타일"' + (n < 2 ? ' disabled' : '') + '>‹</button>' +
      '<div class="st"><b>' + h(st.title) + '</b><span>' + h(st.priceText || '') + (n > 1 ? ' · ' + (i + 1) + '/' + n : '') + '</span></div>' +
      '<button type="button" data-act="styleNext" data-d="1" aria-label="다음 스타일"' + (n < 2 ? ' disabled' : '') + '>›</button></div>' +
      '<div class="sp">' + pointsHtml(st) + '</div>' +
      '<div class="sview"><button type="button" data-act="view" data-v="model" class="' + (me ? '' : 'on') + '">기본 모델</button>' +
      '<button type="button" data-act="view" data-v="me" class="' + (me ? 'on' : '') + '">내 아바타</button>' +
      (styleApplied(st) ? '<span class="sapplied">코디 적용됨</span>' : '<button type="button" class="sapply" data-act="styleApply">이 코디로 핏 보기</button>') + '</div>' +
      '<button type="button" class="sgo" data-act="styleTryon">내 아바타로 입어보기<small>남은 ' + tryLeft() + '회 · ' + h(planNow().name) + '</small></button>' +
      '<div class="sshop">' + shopBtn(st, 'coupang') + shopBtn(st, 'naver') + '</div></div>';
  }
  function fab() { return '<button type="button" class="fab" data-act="open" data-name="avatar" aria-label="아바타 만들기"><span class="fi">' + IC.avatar + '</span><span>아바타 만들기</span></button>'; }
  function subCard() {
    var s = subNow(), p = planNow();
    return '<div class="card"><div class="h"><span>구독 · 입어보기 횟수</span><span class="tag real">' + h(p.name) + '</span></div>' +
      '<div class="line"><span>이번 달 남은 횟수</span><b>' + tryLeft() + ' / ' + p.limit + '회</b></div>' +
      '<div class="line"><span>이번 달 사용</span><b>' + s.used + '회</b></div>' +
      '<button class="btn sm" data-act="open" data-name="plan">플랜 보기 · 바꾸기</button></div>';
  }
  function viewAvatarSheet() {
    var p = state.profile, ok = E.num(p.height) && E.num(p.weight);
    function val(v, u) { return v !== '' && v != null ? '<b>' + h(v) + u + '</b>' : '<b class="warn">없음</b>'; }
    return '<h3>아바타 만들기</h3>' +
      '<div class="note">탑뷰(TopView) 등 다른 곳에서 만든 내 아바타 이미지(정면 전신)를 올려 주세요. 올린 이미지는 이 기기에만 저장되고, “내 아바타로 입어보기”를 누를 때만 입히기 서버로 전달돼요. 성별·키·몸무게·치수는 핏(타이트·여유) 계산에 쓰여요. 올리지 않으면 기본 캐릭터가 쓰여요.</div>' +
      '<div class="card"><div class="h"><span>내 체형</span>' + (ok ? '<span class="tag real">준비됨</span>' : '<span class="tag">치수 필요</span>') + '</div>' +
      '<div class="line"><span>성별</span><b>' + (p.gender === 'male' ? '남성' : '여성') + '</b></div>' +
      '<div class="line"><span>키</span>' + val(p.height, 'cm') + '</div>' +
      '<div class="line"><span>몸무게</span>' + val(p.weight, 'kg') + '</div>' +
      '<div class="line"><span>아바타 이미지</span><b>' + (urls.avatar ? '연결됨' : '기본 캐릭터') + '</b></div>' +
      '<button class="btn' + (ok ? ' sm' : ' p') + '" data-act="open" data-name="settings">' + (ok ? '치수 수정 (설정)' : '성별·키·몸무게 입력하기') + '</button></div>' +
      subCard() + mediaCard() +
      '<button class="btn p" data-act="closeSheet">완료</button>';
  }
  function viewPlanSheet() {
    var s = subNow();
    return '<h3>구독 플랜</h3>' +
      '<div class="rec">현재 <b>' + h(planNow().name) + '</b> · 이번 달 ' + s.used + '회 사용 · 남은 <b>' + tryLeft() + '회</b></div>' +
      (tryLeft() <= 0 ? '<div class="warn">이번 달 입어보기 횟수를 다 썼어요. 플랜을 올리면 바로 더 쓸 수 있어요.</div>' : '') +
      Object.keys(FD.plans).map(function (k) {
        var p = FD.plans[k], on = k === s.plan;
        return '<div class="card plan' + (on ? ' on' : '') + '"><div class="h"><span>' + h(p.name) + ' <span class="sub">' + h(p.price || '') + '</span></span><b>월 ' + p.limit + '회</b></div>' +
          '<div class="note">' + (p.features || []).map(h).join(' · ') + '</div>' +
          (on ? '<span class="tag real" style="align-self:flex-start">사용 중</span>' : '<button class="btn sm" data-act="plan" data-plan="' + h(k) + '">이 플랜 선택</button>') + '</div>';
      }).join('') +
      '<div class="note">결제 연동 전이라 플랜 선택은 이 기기 안에서만 적용되는 체험용입니다. AI 서버에는 기기당 하루 이용 한도가 따로 있어요.</div>' +
      '<button class="btn" data-act="closeSheet">닫기</button>';
  }
  ACT.styleTab = function (el) { state.styleTab = el.dataset.tab; ensureStyle(); state.view = 'model'; save(); render(); };
  ACT.styleNext = function (el) {
    var list = stylesIn(state.styleTab); if (list.length < 2) return;
    var i = list.indexOf(curStyle()), j = (i + Number(el.dataset.d) + list.length) % list.length;
    state.styleId = list[j].id; state.view = 'model'; save(); render();
  };
  ACT.styleApply = function () { var st = curStyle(); if (!st) return; importStyle(st); toast('코디를 옷장에 넣었어요. 상의·하의·신발 버튼에서 사이즈를 고를 수 있어요.'); render(); };
  ACT.view = function (el) {
    state.view = el.dataset.v; save();
    if (state.view === 'me' && !wornImage()) toast('아직 입어 본 모습이 없어요. 아래 버튼으로 내 아바타에 입혀 보세요.');
    render();
  };
  ACT.noLink = function () { toast('구매 링크 준비중입니다.'); };
  ACT.plan = function (el) { var k = el.dataset.plan; if (!FD.plans[k]) return; subNow().plan = k; save(); toast(FD.plans[k].name + ' 플랜으로 바꿨어요 (결제 연동 전 체험용).'); render(); };
  /* 내 아바타로 입어보기: 치수 → 남은 횟수 → 스타일 옷을 옷장에 넣고 → 기존 AI 입혀 보기 */
  ACT.styleTryon = function () {
    var st = curStyle(); if (!st || genPending) return;
    if (!E.num(state.profile.height) || !E.num(state.profile.weight)) { toast('먼저 성별·키·몸무게를 입력해 주세요.'); openSheet('settings'); return; }
    if (tryLeft() <= 0) { toast('이번 달 입어보기 횟수를 다 썼어요.'); openSheet('plan'); return; }
    if (!genEnabled()) { toast('AI 입혀 보기 서버가 꺼져 있어요.'); return; }
    importStyle(st);
    var main = ['top', 'bottom', 'shoe'].map(function (c) { return item(styleItemId(st, c)); }).filter(function (x) { return x && x.photo; })[0];
    if (!main) { toast('이 스타일의 상품 사진을 올리면 내 아바타에 입혀 드려요.'); openSheet('top'); return; }
    ACT.genTryon({ dataset: { id: main.id } });
  };

  /* 둘러보기(프로필 없이 메인 화면): 보기·넘기기·구매 링크는 되고, 내 체형·아바타 기능을 누르면 프로필 선택 화면으로 간다 */
  function showLogin() { if (user) return; lgOpen = true; resetLogin(); try { history.pushState({ lgo: 1 }, ''); } catch (e) {} render(); window.scrollTo(0, 0); }
  function gate(msg) { toast(msg || '프로필을 만들거나 로그인하면 쓸 수 있어요.'); showLogin(); }
  ACT.lgOpen = function () { showLogin(); };
  /* 메인 화면의 '치수' 버튼: 설정 시트를 열고 내 신체 사이즈 입력칸으로 바로 이동 */
  ACT.bodyInput = function () {
    if (!user) return gate('프로필을 만들면 내 신체 치수를 입력할 수 있어요.');
    openSheet('settings');
    setTimeout(function () { var t = document.getElementById('sec-body'), sh = root.querySelector('.sheet'); if (t && sh) sh.scrollTop = t.offsetTop - 8; }, 50);
  };
  ACT.lgClose = function () { if (history.state && history.state.lgo) history.back(); else { lgOpen = false; resetLogin(); render(); } };
  ACT.switchUser = function () { ACT.logout(); showLogin(); };
  var _open = ACT.open, _styleApply = ACT.styleApply, _view = ACT.view, _styleTryon = ACT.styleTryon, _plan = ACT.plan;
  ACT.open = function (el) { if (!user) return gate(); _open(el); };
  ACT.styleApply = function () { if (!user) return gate('프로필을 만들면 내 체형으로 이 코디의 핏을 볼 수 있어요.'); _styleApply(); };
  ACT.view = function (el) { if (!user && el.dataset.v === 'me') return gate('프로필을 만들고 내 아바타에 입혀 보세요.'); _view(el); };
  ACT.styleTryon = function () { if (!user) return gate('프로필을 만들면 내 아바타로 입어볼 수 있어요.'); _styleTryon(); };
  ACT.plan = function (el) { if (!user) return gate(); _plan(el); };

  /* 이미지 화면을 누르면 전체 화면으로 보기(다시 누르거나 ✕ 로 닫기) */
  function closeFull() { var o = document.getElementById('fsview'); if (o) o.remove(); document.removeEventListener('keydown', fullKey); }
  function fullKey(e) { if (e.key === 'Escape') closeFull(); }
  function openFull(m) {
    closeFull();
    var c = m.cloneNode(true); c.removeAttribute('id'); c.style.bottom = '0';
    Array.prototype.forEach.call(c.querySelectorAll('.rbadge'), function (n) { n.remove(); });
    var o = document.createElement('div'); o.id = 'fsview'; o.appendChild(c);
    o.insertAdjacentHTML('beforeend', '<button type="button" class="fsx" aria-label="닫기">✕</button>');
    o.addEventListener('click', closeFull);
    document.body.appendChild(o);
    document.addEventListener('keydown', fullKey);
  }
  root.addEventListener('click', function (e) {
    if (clean && (user || !lgOpen)) { clean = false; render(); return; }
    var m = e.target.closest('#rmedia');
    if (m && !e.target.closest('[data-act],button,a')) { openFull(m); return; }
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = ACT[el.dataset.act];
    if (fn) fn(el);
  });

  try { history.replaceState({}, ''); } catch (e) {}
  render();
  loadMedia().then(function () { render(); genResume(); });
})();
