/* Fit Engine: 상품 실측 − 내 치수 = 여유분(ease) 을 부위별로 계산한다. AI·서버 없이 동작.
   브라우저(window.FitEngine)와 node(require) 양쪽에서 쓴다. */
(function (root) {
  var CFG = (typeof module !== 'undefined' && module.exports) ? require('./fit-config.js') : root.FIT_CONFIG;

  var GKEYS = ['tightBad', 'tight', 'fit', 'loose', 'over'];
  var PREF_TO_IDX = { tight: 'tight', fit: 'fit', loose: 'loose', over: 'over' };

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function r1(n) { return Math.round(n * 10) / 10; }

  /* ---------- 내 몸 치수 ---------- */
  /* 입력값은 'real', 없으면 키·몸무게로 추정해 'est' 로 표시한다. */
  function bodyOf(profile, cfg) {
    cfg = cfg || CFG;
    var m = profile.m || {};
    var h = num(profile.height), w = num(profile.weight);
    var g = profile.gender === 'female' ? 'female' : 'male';
    var out = { vals: {}, src: {} };
    if (!h) return out;
    var bmi = w ? w / Math.pow(h / 100, 2) : 22;
    var est = cfg.estimate[g], slope = cfg.estimate.bmiSlope;
    function lin(key) { var e = est[key]; return e[0] * h + e[1] + (slope[key] || 0) * (bmi - 22); }
    var calc = {
      chest: lin('chest'), shoulder: lin('shoulder'), waist: lin('waist'), hip: lin('hip'), thigh: lin('thigh'),
      arm: 0.34 * h, inseam: 0.44 * h, rise: 0.155 * h, foot: 0.15 * h * 10
    };
    Object.keys(calc).forEach(function (k) {
      var v = num(m[k]);
      if (v !== null) { out.vals[k] = v; out.src[k] = 'real'; }
      else { out.vals[k] = r1(calc[k]); out.src[k] = 'est'; }
    });
    out.vals.height = h;
    out.src.height = 'real';
    return out;
  }

  /* ---------- 등급 ---------- */
  function gradeOf(ease, th) {
    for (var i = 0; i < th.length; i++) if (ease < th[i]) return i;
    return th.length;
  }
  function gname(kind, idx) { return CFG.gradeNames[kind][idx]; }

  function circPart(key, label, flat, body, cfg, bonus, measureType) {
    var gar = measureType === 'flat' ? flat * 2 : flat;
    var raw = gar - body.vals[key];
    var eff = raw;
    /* 소재 보정: 신축성이 크면 쪼임·타이트 경계를 낮춰 조이는 쪽을 더 너그럽게 본다(데님은 반대) */
    var th0 = cfg.grades[key].th;
    var th = [th0[0] - bonus, th0[1] - bonus, th0[2], th0[3]];
    var gi = gradeOf(eff, th);
    return {
      key: key, label: label, kind: 'circ', ease: r1(raw), eff: r1(eff), gradeIdx: gi, th: th, unit: 'cm',
      gradeKey: GKEYS[gi], grade: gname('body', gi), src: body.src[key],
      detail: '옷 ' + r1(gar) + ' − 몸 ' + r1(body.vals[key]) + ' = ' + (raw >= 0 ? '+' : '') + r1(raw) + 'cm'
    };
  }

  function signed(n) { return (n >= 0 ? '+' : '') + r1(n); }

  /* ---------- 상의 ---------- */
  function lengthText(len, body) {
    var h = body.vals.height;
    var hem = 0.835 * h - len;
    var r = hem / h;
    if (r >= 0.58) return '허리 위(크롭 기장)';
    if (r >= 0.52) return '허리선 부근까지';
    if (r >= 0.47) return '엉덩이 윗부분까지';
    if (r >= 0.42) return '엉덩이 아래까지 덮음';
    return '허벅지 중간 아래까지 내려옴';
  }

  function evalTop(body, g, row, cfg) {
    var bonus = (cfg.fabric[g.fabric] || { bonus: 0 }).bonus;
    var parts = [];
    var chest = num(row.chest);
    if (chest !== null) parts.push(circPart('chest', '가슴', chest, body, cfg, bonus, g.measureType));
    var sh = num(row.shoulder);
    if (sh !== null) {
      var d = sh - body.vals.shoulder, t;
      if (d <= -2) t = '어깨가 끼임 (' + signed(d) + 'cm)';
      else if (d < 1) t = '어깨선이 거의 맞음';
      else if (d < 4) t = '어깨선이 팔 쪽으로 약 ' + r1(d) + 'cm 내려감';
      else t = '어깨선이 많이 처짐 (약 ' + r1(d) + 'cm)';
      parts.push({ key: 'shoulder', label: '어깨', kind: 'text', diff: r1(d), text: t, src: body.src.shoulder, gradeKey: d <= -2 ? 'tightBad' : (d < 4 ? 'fit' : 'over') });
    }
    var len = num(row.length);
    if (len !== null) parts.push({ key: 'length', label: '총장', kind: 'text', text: lengthText(len, body), src: body.src.height, gradeKey: 'fit' });
    var sl = num(row.sleeve);
    if (sl !== null) {
      var ds = sl - body.vals.arm, ts;
      if (ds < -3) ts = '손목보다 ' + r1(-ds) + 'cm 짧음';
      else if (ds < 1) ts = '손목 부근';
      else if (ds < 5) ts = '손목보다 ' + r1(ds) + 'cm 김';
      else ts = '손등을 덮음 (' + r1(ds) + 'cm 김)';
      parts.push({ key: 'sleeve', label: '소매', kind: 'text', diff: r1(ds), text: ts, src: body.src.arm, gradeKey: ds < -3 ? 'tight' : (ds < 5 ? 'fit' : 'over') });
    }
    return parts;
  }

  /* ---------- 하의 ---------- */
  function hemText(d) {
    if (d >= 3) return '바닥에 끌림, 밑단을 접어야 함';
    if (d >= 0) return '발등을 덮음';
    if (d >= -4) return '복숭아뼈~발등 사이';
    if (d >= -12) return '발목 위';
    return '종아리 쪽까지 올라감';
  }

  function evalBottom(body, g, row, cfg) {
    var bonus = (cfg.fabric[g.fabric] || { bonus: 0 }).bonus;
    var parts = [];
    [['waist', '허리', 'waist'], ['hip', '엉덩이', 'hip'], ['thigh', '허벅지', 'thigh']].forEach(function (p) {
      var v = num(row[p[0]]);
      if (v !== null) parts.push(circPart(p[0], p[1], v, body, cfg, bonus, g.measureType));
    });
    var rise = num(row.rise);
    if (rise !== null) {
      var dr = rise - body.vals.rise;
      parts.push({ key: 'rise', label: '밑위', kind: 'text', diff: r1(dr),
        text: dr < -2 ? '밑위가 짧아 낮게 걸침(' + signed(dr) + 'cm)' : dr > 2 ? '밑위가 깊음(' + signed(dr) + 'cm)' : '밑위 적당',
        src: body.src.rise, gradeKey: 'fit' });
    }
    var ins = num(row.inseam);
    if (ins !== null) {
      var di = ins - body.vals.inseam;
      parts.push({ key: 'inseam', label: '기장', kind: 'text', diff: r1(di), text: hemText(di), src: body.src.inseam, gradeKey: di >= 3 ? 'over' : (di < -12 ? 'tight' : 'fit') });
    }
    return parts;
  }

  /* ---------- 신발 ---------- */
  function evalShoe(body, g, row, cfg) {
    var size = num(row.label);
    var inner = num(row.inner);
    var foot = body.vals.foot;
    var parts = [];
    if (size === null && inner === null) return parts;
    var useInner = inner !== null ? inner : size + 8;
    var ease = useInner - foot;
    var gi = gradeOf(ease, cfg.grades.shoe.th);
    parts.push({
      key: 'shoe', label: '길이', kind: 'circ', ease: r1(ease), eff: r1(ease), gradeIdx: gi, gradeKey: GKEYS[gi],
      grade: gname('shoe', gi), src: body.src.foot,
      detail: (inner !== null ? '안쪽 ' : '표기 ' + size + ' + 8 = ') + r1(useInner) + 'mm − 발 ' + r1(foot) + 'mm = ' + signed(ease) + 'mm',
      unit: 'mm', th: cfg.grades.shoe.th, assumed: inner === null
    });
    if (size !== null) parts.push({ key: 'sizeDiff', label: '표기 사이즈', kind: 'text', text: '내 발길이 대비 ' + signed(size - foot) + 'mm', src: body.src.foot, gradeKey: 'fit' });
    return parts;
  }

  /* ---------- 한 상품·한 사이즈 평가 ---------- */
  function evaluateRow(cat, body, garment, row, cfg) {
    var parts = cat === 'top' ? evalTop(body, garment, row, cfg)
      : cat === 'bottom' ? evalBottom(body, garment, row, cfg)
      : evalShoe(body, garment, row, cfg);
    var primaryKey = cat === 'top' ? 'chest' : cat === 'bottom' ? 'waist' : 'shoe';
    var primary = null;
    parts.forEach(function (p) { if (p.key === primaryKey) primary = p; });
    if (!primary) parts.forEach(function (p) { if (!primary && p.kind === 'circ') primary = p; });
    var anyTightBad = parts.some(function (p) { return p.kind === 'circ' && p.gradeIdx === 0; });
    return { size: row.label, parts: parts, primary: primary, anyTightBad: anyTightBad };
  }

  /* ---------- 사이즈 추천 ---------- */
  function recommend(cat, evals, pref, cfg) {
    var idealKey = cat === 'top' ? 'chest' : cat === 'bottom' ? 'waist' : 'shoe';
    var target = cfg.ideal[idealKey][PREF_TO_IDX[pref] || 'fit'];
    var best = null;
    evals.forEach(function (e) {
      if (!e.primary) return;
      var score = Math.abs(e.primary.eff - target) + (e.anyTightBad ? 8 : 0);
      e.score = r1(score);
      if (!best || score < best.score) best = e;
    });
    return best ? best.size : null;
  }

  /* ---------- 기준 옷(내가 잘 맞는 옷) 대비 차이 ---------- */
  var REF_KEYS = {
    top: [['chest', '가슴단면'], ['shoulder', '어깨'], ['length', '총장'], ['sleeve', '소매']],
    bottom: [['waist', '허리단면'], ['hip', '엉덩이단면'], ['thigh', '허벅지단면'], ['rise', '밑위'], ['inseam', '기장']]
  };
  function refDiff(cat, row, refRow) {
    var out = [];
    (REF_KEYS[cat] || []).forEach(function (k) {
      var a = num(row[k[0]]), b = num(refRow && refRow[k[0]]);
      if (a !== null && b !== null) out.push({ label: k[1], diff: r1(a - b) });
    });
    return out;
  }

  /* ---------- 전체 평가 ---------- */
  /* input: { profile, items:[{cat, garment, size|null, ref:{garment,row}|null}] }
     size 가 null 이면 추천 사이즈를 고른다. */
  function evaluate(input, cfg) {
    cfg = cfg || CFG;
    var body = bodyOf(input.profile, cfg);
    var pref = input.profile.pref || 'fit';
    var results = (input.items || []).map(function (it) {
      var rows = it.garment.sizes || [];
      var evals = rows.map(function (row) { return evaluateRow(it.cat, body, it.garment, row, cfg); });
      var rec = recommend(it.cat, evals, pref, cfg);
      var chosen = it.size || rec;
      var cur = evals.filter(function (e) { return e.size === chosen; })[0] || null;
      var rd = null;
      if (it.ref && cur) {
        var row = rows.filter(function (r) { return r.label === chosen; })[0];
        rd = refDiff(it.cat, row, it.ref.row);
      }
      return { cat: it.cat, garment: it.garment, chosen: chosen, recommended: rec, auto: !it.size, current: cur, all: evals, refDiff: rd };
    });
    return { body: body, pref: pref, results: results, note: outfitNote(results) };
  }

  function outfitNote(results) {
    var top = results.filter(function (r) { return r.cat === 'top'; })[0];
    var bot = results.filter(function (r) { return r.cat === 'bottom'; })[0];
    if (!top || !bot || !top.current || !bot.current || !top.current.primary || !bot.current.primary) return '';
    var a = top.current.primary.gradeIdx, b = bot.current.primary.gradeIdx;
    if (a >= 4 && b >= 3) return '상의와 하의가 모두 넉넉해서 전체 실루엣이 크게 보입니다.';
    if (a <= 1 && b <= 1) return '상의와 하의가 모두 몸에 붙는 편이라 전체 실루엣이 슬림합니다.';
    if (a >= 3 && b <= 1) return '상의는 넉넉하고 하의는 슬림한 조합입니다.';
    if (a <= 1 && b >= 3) return '상의는 슬림하고 하의는 넉넉한 조합입니다.';
    return '';
  }

  var API = { bodyOf: bodyOf, gradeOf: gradeOf, evaluateRow: evaluateRow, recommend: recommend, refDiff: refDiff, evaluate: evaluate, GKEYS: GKEYS, num: num };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.FitEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
