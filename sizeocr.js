/* 사이즈표 캡처 → 실측표 자동 입력.
   글자 읽기(OCR)는 브라우저 안에서 Tesseract.js 로 한다. 사진은 서버로 보내지 않고,
   글자 인식 엔진·한글 학습 데이터만 공개 CDN 에서 내려받는다. 읽은 결과는 사람이 확인·수정해야 한다. */
(function (root) {
  'use strict';

  var SIZE_WORDS = /^(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|F|FREE|FR|프리|프리사이즈)$/i;
  /* 항목별 키워드(공백 제거 후 포함 여부). 위에서부터 먼저 맞는 항목에 줄을 배정한다 */
  var KEYS = {
    top: [['chest', ['가슴', '가슬', '기슴', '가습', '흉']], ['shoulder', ['어깨', '어께', '어메', '어꺠']], ['sleeve', ['소매', '소메', '팔길이', '팔']], ['length', ['총장', '총기장', '기장', '총길이', '좋길이', '길이']]],
    bottom: [['waist', ['허리', '하리']], ['hip', ['엉덩이', '힙']], ['thigh', ['허벅지', '허박지']], ['rise', ['밑위', '밑우']], ['inseam', ['인심', '안쪽', '총장', '기장', '총길이', '길이']]],
    shoe: [['inner', ['안쪽', '안길이', '발길이', '내부']]]
  };
  var NUM = /\d+(?:\.\d+)?/g;

  function nums(s) { return (String(s).match(NUM) || []).map(Number); }
  function squeeze(s) { return String(s).replace(/\s+/g, '').toLowerCase(); }

  /* 소수점 OCR 오류 보정: "35. 5", "13, 5" → 35.5, 13.5 */
  function fixNum(l) { return l.replace(/(\d)\s*[.,]\s+(\d)(?!\d)/g, '$1.$2'); }

  /* 사이즈가 세로, 항목이 가로인 표 (쿠팡에 흔함): 머리줄의 항목 순서대로 아래 줄 숫자를 읽는다 */
  function parseColumns(lines, cat) {
    var keys = KEYS[cat] || [], best = null;
    function rowsAfter(hi, order) {
      var out = [];
      for (var j = hi + 1; j < lines.length; j++) {
        var m = fixNum(lines[j]).normalize('NFKC').match(/^\W*((?:[2-4]?XL|XXL|XXXL|XXS|XS|S|M|L|F|FREE))\b(.*)$/i);
        if (!m) continue;
        var n = nums(m[2].replace(/\d+\s*[-~]\s*\d+/g, ' ')).filter(function (x) { return x > 0 && x < 300; });
        if (n.length < order.length) continue;
        var rec = { label: m[1].toUpperCase() };
        order.forEach(function (f, c) { rec[f] = String(n[c]); });
        out.push(rec);
      }
      return out;
    }
    for (var i = 0; i < lines.length; i++) {
      var sq = squeeze(lines[i]), hits = [];
      keys.forEach(function (k) {
        k[1].slice().sort(function (a, b) { return b.length - a.length; }).some(function (w) {
          var p = sq.indexOf(w);
          if (p < 0) return false;
          hits.push({ f: k[0], p: p });
          sq = sq.slice(0, p) + new Array(w.length + 1).join('_') + sq.slice(p + w.length);
          return true;
        });
      });
      if (hits.length < 2) continue;
      var order = hits.sort(function (a, b) { return a.p - b.p; }).map(function (x) { return x.f; });
      var out = rowsAfter(i, order), score = out.length * order.length;
      if (out.length && (!best || score > best.score)) best = { score: score, sizes: out, found: order.length };
    }
    return best ? { sizes: best.sizes, found: best.found } : null;
  }

  /* 한 글자만 틀리게 읽힌 값(4→1, 5→3 등)을 같은 열의 이웃 값 흐름에 맞춰 고친다. 고친 칸은 알려 주고 사람이 확인한다 */
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); return b.length ? b[Math.floor(b.length / 2)] : 0; }
  var PLAUSIBLE = { chest: [30, 160], shoulder: [25, 70], length: [30, 120], sleeve: [8, 80], waist: [25, 160], hip: [25, 160], thigh: [15, 90], rise: [15, 50], inseam: [40, 100] };
  /* 값 목록에서 '믿을 수 있는 칸': 말이 되는 범위 안이고 사이즈가 커질수록 커지는 가장 긴 열 */
  function trustedCells(v, f) {
    var rg = PLAUSIBLE[f] || [1, 300], idx = [];
    v.forEach(function (x, i) { if (x >= rg[0] && x <= rg[1]) idx.push(i); });
    var len = {}, prev = {}, best = null;
    idx.forEach(function (i) {
      len[i] = 1; prev[i] = null;
      idx.forEach(function (j) { if (j < i && v[j] <= v[i] && len[j] + 1 > len[i]) { len[i] = len[j] + 1; prev[i] = j; } });
      if (best == null || len[i] > len[best]) best = i;
    });
    var ok = v.map(function () { return false; });
    for (var k = best; k != null; k = prev[k]) ok[k] = true;
    return ok;
  }
  /* 믿는 칸들로 i번째 칸의 기대값(이웃 사이 보간, 끝이면 추세 연장). self=true 면 자기 자신은 빼고 계산 */
  function expectedAt(v, i, ok) {
    var L = [], R = [], k;
    for (k = i - 1; k >= 0 && L.length < 2; k--) if (ok[k]) L.push(k);
    for (k = i + 1; k < v.length && R.length < 2; k++) if (ok[k]) R.push(k);
    if (L.length && R.length) return v[L[0]] + (v[R[0]] - v[L[0]]) * (i - L[0]) / (R[0] - L[0]);
    if (L.length === 2) return v[L[0]] + (v[L[0]] - v[L[1]]) / (L[0] - L[1]) * (i - L[0]);
    if (R.length === 2) return v[R[0]] - (v[R[1]] - v[R[0]]) / (R[1] - R[0]) * (R[0] - i);
    return null;
  }
  function candidates(str) {
    var out = {}, s = String(str);
    for (var k = 0; k < s.length; k++) {
      if (s[k] === '.') continue;
      for (var d = 0; d <= 9; d++) out[s.slice(0, k) + d + s.slice(k + 1)] = 1;
    }
    if (s.length <= 2 && s.indexOf('.') < 0) for (var e = 1; e <= 9; e++) out[e + s] = 1;
    return Object.keys(out).filter(function (x) { return Number(x) > 0; });
  }
  function repair(sizes) {
    var fixed = [], fields = {};
    sizes.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== 'label') fields[k] = 1; }); });
    Object.keys(fields).forEach(function (f) {
      if (sizes.length < 4) return;
      var v = sizes.map(function (r) { return Number(r[f]); }), ok = trustedCells(v, f), i;
      var steps = []; for (i = 1; i < v.length; i++) if (ok[i] && ok[i - 1] && v[i] >= v[i - 1]) steps.push(v[i] - v[i - 1]);
      var step = Math.max(median(steps), 0.5), thr = Math.max(1.5, 1.8 * step);
      /* 믿는 칸이라도 이웃들이 만든 흐름에서 너무 벗어나면(예: 54가 51로 읽힘) 의심 칸으로 돌린다 */
      var out = ok.slice();
      for (i = 0; i < v.length; i++) {
        if (!ok[i]) continue;
        var tmp = ok.slice(); tmp[i] = false;
        var ex0 = expectedAt(v, i, tmp), edge = i === 0 || i === v.length - 1;
        if (ex0 != null && Math.abs(v[i] - ex0) > thr * (edge ? 1.5 : 1)) out[i] = false;
      }
      ok = out;
      for (i = 0; i < v.length; i++) {
        if (ok[i]) continue;
        var ex = expectedAt(v, i, ok);
        if (ex == null) continue;
        var bestC = null, bestD = 1e9;
        candidates(sizes[i][f]).forEach(function (c) { var d = Math.abs(Number(c) - ex); if (d < bestD) { bestD = d; bestC = c; } });
        if (bestC != null && bestD <= Math.max(1.2, 0.6 * step)) {
          if (Number(bestC) !== v[i]) fixed.push(sizes[i].label + ' ' + f + ' ' + sizes[i][f] + '→' + bestC);
          sizes[i][f] = bestC; v[i] = Number(bestC); ok[i] = true;
        }
      }
    });
    return fixed;
  }

  /* 사이즈가 커지면 값도 커져야 한다: 이웃과 어긋난 칸을 찾아 알려 준다 */
  function suspect(sizes) {
    var bad = [], fields = {};
    sizes.forEach(function (r) { Object.keys(r).forEach(function (k) { if (k !== 'label') fields[k] = 1; }); });
    Object.keys(fields).forEach(function (f) {
      sizes.forEach(function (r, i) {
        var v = Number(r[f]), p = i > 0 ? Number(sizes[i - 1][f]) : null, q = i < sizes.length - 1 ? Number(sizes[i + 1][f]) : null;
        if ((p != null && !(v >= p)) || (q != null && !(v <= q))) bad.push(r.label + ' ' + f);
      });
    });
    return bad;
  }

  /* OCR 로 읽은 글자 → { sizes:[{label, 필드...}], found:n, circ:bool } (못 읽으면 sizes 빈 배열) */
  function parse(text, cat) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (cat !== 'shoe') {
      var col = parseColumns(lines, cat), all = lines.join('').replace(/\s+/g, '');
      if (col) var big = col.sizes.some(function (r) { return Number(r.chest || r.waist || r.hip || 0) > 70; });
      var fixed = repair(col.sizes);
      return { sizes: col.sizes, found: col.found, circ: !!big || (/둘레|물레/.test(all) && !/단면/.test(all)), bad: suspect(col.sizes), fixed: fixed };
    }
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
    return { sizes: out, found: found.length, circ: circ && !flat, bad: suspect(out) };
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

  /* 사이즈표 글자를 보고 상의/하의/신발을 짐작한다. 키워드가 가장 많이 나온 쪽, 없으면 신발 사이즈(mm) 숫자 여부, 그래도 모르면 상의 */
  function detectCat(text) {
    var sq = squeeze(text);
    function cnt(words) { return words.reduce(function (n, w) { return n + (sq.indexOf(w) >= 0 ? 1 : 0); }, 0); }
    var top = cnt(['가슴', '어깨', '소매', '흉', '팔길이']), bottom = cnt(['허리', '엉덩이', '허벅지', '밑위', '인심', '힙', '밑단']);
    if (bottom > top) return 'bottom';
    if (top > 0) return 'top';
    var lines = String(text || '').split(/\r?\n/);
    var shoe = lines.some(function (l) { return nums(l).filter(function (x) { return x >= 200 && x <= 330 && x % 5 === 0; }).length >= 3; });
    return shoe ? 'shoe' : 'top';
  }

  root.SizeOcr = { parse: parse, recognize: recognize, detectCat: detectCat };
  if (typeof module !== 'undefined') module.exports = root.SizeOcr;
})(typeof window !== 'undefined' ? window : globalThis);
