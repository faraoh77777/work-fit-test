/* 사이즈표 캡처 → 실측표 자동 입력.
   글자 읽기(OCR)는 브라우저 안에서 Tesseract.js 로 한다. 사진은 서버로 보내지 않고,
   글자 인식 엔진·한글 학습 데이터만 공개 CDN 에서 내려받는다. 읽은 결과는 사람이 확인·수정해야 한다. */
(function (root) {
  'use strict';

  var SIZE_WORDS = /^(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|F|FREE|FR|프리|프리사이즈)$/i;
  /* 항목별 키워드(공백 제거 후 포함 여부). 위에서부터 먼저 맞는 항목에 줄을 배정한다 */
  var KEYS = {
    top: [['chest', ['가슴', '흉']], ['shoulder', ['어깨']], ['sleeve', ['소매', '팔길이', '팔']], ['length', ['총장', '총기장', '기장', '길이']]],
    bottom: [['waist', ['허리']], ['hip', ['엉덩이', '힙']], ['thigh', ['허벅지']], ['rise', ['밑위']], ['inseam', ['인심', '안쪽', '총장', '기장', '길이']]],
    shoe: [['inner', ['안쪽', '안길이', '발길이', '내부']]]
  };
  var NUM = /\d+(?:\.\d+)?/g;

  function nums(s) { return (String(s).match(NUM) || []).map(Number); }
  function squeeze(s) { return String(s).replace(/\s+/g, '').toLowerCase(); }

  /* OCR 로 읽은 글자 → { sizes:[{label, 필드...}], found:n, circ:bool } (못 읽으면 sizes 빈 배열) */
  function parse(text, cat) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var keys = KEYS[cat] || [], used = {}, rows = {}, circ = false, flat = false;

    if (cat === 'shoe') {
      var sizes = [];
      lines.some(function (l) { var n = nums(l).filter(function (x) { return x >= 200 && x <= 330 && x % 5 === 0; }); if (n.length >= 3) { sizes = n; return true; } return false; });
      if (!sizes.length) return { sizes: [], found: 0, circ: false };
      return { sizes: sizes.map(function (v) { return { label: String(v) }; }), found: 0, circ: false };
    }

    keys.forEach(function (k) {
      for (var i = 0; i < lines.length; i++) {
        if (used[i]) continue;
        var sq = squeeze(lines[i]);
        if (!k[1].some(function (w) { return sq.indexOf(w) >= 0; })) continue;
        var n = nums(lines[i].replace(/\(.*?\)/g, ' ')).filter(function (x) { return x > 0 && x < 300; });
        if (n.length < 2) continue;
        used[i] = true; rows[k[0]] = n;
        if (sq.indexOf('둘레') >= 0) circ = true;
        if (sq.indexOf('단면') >= 0) flat = true;
        break;
      }
    });
    var found = Object.keys(rows);
    if (!found.length) return { sizes: [], found: 0, circ: false };

    /* 사이즈 이름 줄: 문자 사이즈(S M L …)가 2개 이상 있는 줄 */
    var labels = null;
    for (var i = 0; i < lines.length && !labels; i++) {
      var toks = lines[i].normalize('NFKC').split(/[\s|,/]+/).filter(Boolean);
      var hit = toks.filter(function (t) { return SIZE_WORDS.test(t); });
      if (hit.length >= 2 && hit.length >= toks.length - 3) labels = hit.map(function (t) { return t.toUpperCase(); });
    }
    for (var j = 0; j < lines.length && !labels; j++) {
      var sq2 = squeeze(lines[j]);
      if (sq2.indexOf('사이즈') < 0 && sq2.indexOf('size') < 0) continue;
      var nn = nums(lines[j]);
      if (nn.length >= 2) labels = nn.map(String);
    }
    var count = Math.max.apply(null, found.map(function (f) { return rows[f].length; }));
    if (labels && labels.length < count) labels = null;
    /* 개수가 다르면 가장 많이 읽힌 줄 기준으로 맞춘다 */
    var n = labels ? labels.length : count;
    if (!labels) labels = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].slice(0, n).concat(new Array(Math.max(0, n - 6)).fill(''));
    var out = [];
    for (var c = 0; c < n; c++) {
      var rec = { label: labels[c] };
      found.forEach(function (f) {
        var arr = rows[f], off = arr.length - n;     /* 오른쪽 끝을 기준으로 정렬 (앞쪽 잡음 숫자 무시) */
        var v = arr[c + off];
        if (arr.length >= n && v != null) rec[f] = String(v);
      });
      out.push(rec);
    }
    return { sizes: out, found: found.length, circ: circ && !flat };
  }

  var loading = null;
  function loadEngine() {
    if (root.Tesseract) return Promise.resolve();
    if (!loading) loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
      s.onload = res; s.onerror = function () { loading = null; rej(new Error('글자 인식 엔진을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  /* 표의 긴 가로·세로 선은 글자 인식을 방해하므로 지운다 (글자 획보다 훨씬 긴 검은 줄만) */
  function stripLines(ctx, w, h) {
    var im = ctx.getImageData(0, 0, w, h), d = im.data, min = Math.max(70, Math.round(Math.max(w, h) * 0.045));
    var dark = new Uint8Array(w * h), kill = new Uint8Array(w * h), x, y, run, s;
    for (var i = 0; i < w * h; i++) dark[i] = d[i * 4] < 150 ? 1 : 0;
    for (y = 0; y < h; y++) {
      run = 0;
      for (x = 0; x <= w; x++) {
        if (x < w && dark[y * w + x]) run++;
        else { if (run >= min) for (s = x - run; s < x; s++) kill[y * w + s] = 1; run = 0; }
      }
    }
    for (x = 0; x < w; x++) {
      run = 0;
      for (y = 0; y <= h; y++) {
        if (y < h && dark[y * w + x]) run++;
        else { if (run >= min) for (s = y - run; s < y; s++) kill[s * w + x] = 1; run = 0; }
      }
    }
    for (i = 0; i < w * h; i++) {
      if (kill[i]) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
      else { var v = dark[i] ? 0 : 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
    }
    ctx.putImageData(im, 0, 0);
  }
  /* 작은 캡처도 읽히도록 확대하고 흑백으로 바꾼다 */
  function prep(file) {
    return new Promise(function (res) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.max(1, Math.min(3, 1800 / img.width));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.imageSmoothingQuality = 'high';
        x.filter = 'grayscale(1) contrast(1.25)';
        x.drawImage(img, 0, 0, c.width, c.height);
        try { stripLines(x, c.width, c.height); } catch (e) { /* 선 제거 실패 시 원본 그대로 */ }
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { res(b || file); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(file); };
      img.src = u;
    });
  }
  function recognize(file, onProgress) {
    var worker = null;
    return loadEngine().then(function () {
      return Promise.all([prep(file), root.Tesseract.createWorker('kor+eng', 1, { logger: function (m) { if (onProgress && m && m.progress != null) onProgress(m.status, m.progress); } })]);
    }).then(function (r) {
      worker = r[1];
      return worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' }).then(function () { return worker.recognize(r[0]); });
    }).then(function (r) { return worker.terminate().then(function () { return r.data.text; }); },
      function (e) { if (worker) worker.terminate(); throw e; });
  }

  root.SizeOcr = { parse: parse, recognize: recognize };
  if (typeof module !== 'undefined') module.exports = root.SizeOcr;
})(typeof window !== 'undefined' ? window : globalThis);
