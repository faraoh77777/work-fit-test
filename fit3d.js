/* 3D 핏 보기: 입력한 치수(키·가슴·허리·엉덩이·어깨·허벅지·팔·인심 …)로 3D 체형을 만들고,
   고른 옷의 치수대로 옷을 얹어 꽉 끼는 정도를 색으로 보여 준다. 서버·사진 없이 기기 안에서만 계산한다.
   three.js(vendor/three.min.js, MIT)를 쓴다. 길이 단위는 cm. 앞쪽은 +z, 몸 가운데는 x=0. */
(function (root) {
  'use strict';
  var T = root.THREE;
  var N = 28;                                           /* 둘레를 나누는 면 수 */
  var HEAT = { tightBad: 0xd64545, tight: 0xe8913a, fit: 0x34a56a, loose: 0x4a90d9, over: 0x8b6fd1 };
  var S = { renderer: null, scene: null, camera: null, group: null, host: null, raf: 0, rotY: 0, drag: false, lastX: 0, spinAt: 0, ok: null, key: '' };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* 둘레 C, 앞뒤/좌우 비율 k 인 타원의 반지름 [좌우 a, 앞뒤 b] (라마누잔 근사) */
  function ab(C, k) { var f = Math.PI * (3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))); var a = C / f; return [a, a * k]; }

  /* rings: [{y, cx, cz, rx, rz}] 아래→위. 원통 모양 면을 만든다 */
  function loft(rings, capBottom, capTop) {
    var pos = [], idx = [], i, j;
    rings.forEach(function (r) {
      for (j = 0; j < N; j++) { var t = j / N * Math.PI * 2; pos.push((r.cx || 0) + r.rx * Math.cos(t), r.y, (r.cz || 0) + r.rz * Math.sin(t)); }
    });
    for (i = 0; i < rings.length - 1; i++) for (j = 0; j < N; j++) {
      var a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N;
      idx.push(a, c, b, b, c, d);
    }
    function cap(ri, up) {
      var r = rings[ri], ci = pos.length / 3; pos.push(r.cx || 0, r.y, r.cz || 0);
      for (j = 0; j < N; j++) { var a2 = ri * N + j, b2 = ri * N + (j + 1) % N; if (up) idx.push(ci, a2, b2); else idx.push(ci, b2, a2); }
    }
    if (capBottom) cap(0, false);
    if (capTop) cap(rings.length - 1, true);
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function interp(rings, y) {                            /* 높이 y 에서 링의 반지름 보간 */
    if (y <= rings[0].y) return [rings[0].rx, rings[0].rz];
    for (var i = 0; i < rings.length - 1; i++) {
      var a = rings[i], b = rings[i + 1];
      if (y <= b.y) { var t = (y - a.y) / ((b.y - a.y) || 1); return [a.rx + (b.rx - a.rx) * t, a.rz + (b.rz - a.rz) * t]; }
    }
    var l = rings[rings.length - 1]; return [l.rx, l.rz];
  }

  /* 몸: 치수에서 체형 뼈대(링)를 만든다 */
  function bodyModel(v) {
    var H = v.height, yc = clamp(v.inseam, 0.38 * H, 0.5 * H);
    var yHip = yc + 0.05 * H, yWaist = 0.615 * H, yChest = 0.72 * H, yShoulder = 0.815 * H, sh = v.shoulder / 2;
    var hip = ab(v.hip, 0.74), waist = ab(v.waist, 0.78), chest = ab(v.chest, 0.72);
    var torso = [
      { y: yc - 2, rx: hip[0] * 0.9, rz: hip[1] * 0.9 }, { y: yHip, rx: hip[0], rz: hip[1] },
      { y: (yHip + yWaist) / 2, rx: (hip[0] + waist[0]) / 2, rz: (hip[1] + waist[1]) / 2 }, { y: yWaist, rx: waist[0], rz: waist[1] },
      { y: (yWaist + yChest) / 2, rx: (waist[0] + chest[0]) / 2, rz: (waist[1] + chest[1]) / 2 }, { y: yChest, rx: chest[0], rz: chest[1] },
      { y: yShoulder - 4, rx: Math.max(chest[0] * 0.98, sh * 0.88), rz: chest[1] * 0.85 }, { y: yShoulder, rx: sh * 0.96, rz: chest[1] * 0.7 },
      { y: 0.842 * H, rx: 6.2, rz: 6.6 }
    ];
    var rT = v.thigh / (2 * Math.PI), xl = Math.max(rT + 0.6, hip[0] * 0.5), yKnee = 0.285 * H, yAnkle = 0.045 * H;
    var legRings = [
      { y: yAnkle, rx: rT * 0.42, rz: rT * 0.42 }, { y: yKnee - 0.4 * (yKnee - yAnkle), rx: rT * 0.7, rz: rT * 0.7 },
      { y: yKnee, rx: rT * 0.63, rz: rT * 0.63 }, { y: (yc + yKnee) / 2, rx: rT * 0.88, rz: rT * 0.88 }, { y: yc + 2, rx: rT * 1.02, rz: rT * 1.02 }
    ];
    var rUA = 0.36 * v.chest / (2 * Math.PI);
    return { H: H, yc: yc, yHip: yHip, yWaist: yWaist, yChest: yChest, yShoulder: yShoulder, sh: sh, torso: torso, legRings: legRings, xl: xl, rT: rT, rUA: rUA, hip: hip, chest: chest, waist: waist };
  }
  var DRIFT = Math.sin(7 * Math.PI / 180), DOWN = Math.cos(7 * Math.PI / 180);
  function armRings(b, v, side, tFrom, tTo, grow, minAdd) {   /* 팔(또는 소매) 링: t=어깨점에서 손목 방향 거리 */
    var x0 = side * (b.sh - 2.5), y0 = b.yShoulder - 3, L = v.arm, out = [], steps = 6;
    for (var i = 0; i <= steps; i++) {
      var t = tFrom + (tTo - tFrom) * i / steps, u = clamp(t / L, 0, 1);
      var r = b.rUA * (u < 0.5 ? 1 - 0.4 * u : 0.8 - 0.6 * (u - 0.5)) ;
      out.push({ y: y0 - DOWN * t, cx: x0 + side * DRIFT * t, cz: 0, rx: r * grow + minAdd, rz: r * grow + minAdd });
    }
    return out.reverse();                                /* 아래→위 */
  }

  function mat(color, opacity) {
    return new T.MeshStandardMaterial({ color: color, roughness: 0.75, metalness: 0, transparent: opacity < 1, opacity: opacity, side: T.DoubleSide });
  }
  function addMesh(g, geo, m) { var me = new T.Mesh(geo, m); g.add(me); return me; }

  function buildBody(g, v, b) {
    var skin = mat(0xd9cfc6, 1), H = b.H;
    addMesh(g, loft(b.torso, true, true), skin);
    [-1, 1].forEach(function (s) {
      var legs = b.legRings.map(function (r) { return { y: r.y, cx: s * b.xl, cz: 0, rx: r.rx, rz: r.rz }; });
      addMesh(g, loft(legs, true, false), skin);
      addMesh(g, loft(armRings(b, v, s, -1, v.arm, 1, 0), true, true), skin);
      var foot = addMesh(g, new T.SphereGeometry(1, 16, 12), skin);
      var fl = (v.foot || 240) / 10; foot.scale.set(4.2, 3.2, fl / 2); foot.position.set(s * b.xl, 3.0, fl / 2 - 4.5);
    });
    var neck = [{ y: 0.835 * H, cx: 0, cz: 0, rx: 5.4, rz: 5.8 }, { y: H - 19, cx: 0, cz: 0.5, rx: 5.0, rz: 5.4 }];
    addMesh(g, loft(neck, false, false), skin);
    var head = addMesh(g, new T.SphereGeometry(1, 24, 18), skin); head.scale.set(7.4, 10.3, 9); head.position.set(0, H - 10.3, 0.6);
  }

  function buildTop(g, v, b, gar) {
    var gc = gar.chest, color = HEAT[gar.heat] || HEAT.fit;
    var hem = Math.max(6, b.yShoulder + 2 - (gar.length || 62)), ratioAt = function (y) { var t = interp(b.torso, y); return t[1] / t[0]; };
    function ring(y, circ) {
      var body = interp(b.torso, y), a = ab(circ, ratioAt(y));
      return { y: y, cx: 0, cz: 0, rx: Math.max(a[0], body[0] + 0.15), rz: Math.max(a[1], body[1] + 0.15) };
    }
    var ys = [hem, Math.min(b.yHip, b.yWaist - 1), b.yWaist, b.yChest].filter(function (y, i, a) { return y >= hem && (i === 0 || y > a[i - 1]); });
    var rings = ys.map(function (y) { return ring(y, gc); });
    var sBody = interp(b.torso, b.yShoulder), gs = (gar.shoulder || v.shoulder) / 2;
    rings.push({ y: b.yShoulder - 4, cx: 0, cz: 0, rx: Math.max(gs * 0.93, interp(b.torso, b.yShoulder - 4)[0] + 0.15), rz: ring(b.yChest, gc).rz * 0.88 });
    rings.push({ y: b.yShoulder, cx: 0, cz: 0, rx: Math.max(gs * 0.97, sBody[0] + 0.15), rz: sBody[1] + 0.3 });
    rings.push({ y: b.yShoulder + 3, cx: 0, cz: 0.3, rx: 6.9, rz: 7.2 });
    addMesh(g, loft(rings, false, false), mat(color, 0.9));
    var scale = clamp(gc / v.chest, 0.8, 1.6), sl = Math.min(gar.sleeve || 20, v.arm);
    [-1, 1].forEach(function (s) { addMesh(g, loft(armRings(b, v, s, -2, sl, 1 + (scale - 1) * 0.7, 0.25), false, false), mat(color, 0.9)); });
  }

  function buildBottom(g, v, b, gar) {
    var color = HEAT[gar.heat] || HEAT.fit, top = b.yc + (gar.rise || v.rise || 26), hemY = Math.max(3, b.yc - (gar.inseam || 72));
    function wrap(y, circ) { var body = interp(b.torso, y), a = ab(circ, body[1] / body[0]); return { y: y, cx: 0, cz: 0, rx: Math.max(a[0], body[0] + 0.15), rz: Math.max(a[1], body[1] + 0.15) }; }
    var gh = Math.max(gar.hip || v.hip, gar.waist || v.waist);
    var hipRings = [wrap(b.yc - 2, gh * 0.98), wrap(b.yHip, gh), wrap((b.yHip + top) / 2, (gh + (gar.waist || v.waist)) / 2), wrap(top, gar.waist || v.waist)];
    addMesh(g, loft(hipRings, false, false), mat(color, 0.9));
    var rt = (gar.thigh || b.rT * 2 * Math.PI) / (2 * Math.PI);
    [-1, 1].forEach(function (s) {
      var rings = [], steps = 5;
      for (var i = 0; i <= steps; i++) {
        var y = hemY + (b.yc + 2 - hemY) * i / steps, t = (y - hemY) / ((b.yc + 2 - hemY) || 1);
        var bodyR = interp(b.legRings, y)[0], r = rt * (0.78 + 0.22 * t);
        rings.push({ y: y, cx: s * b.xl, cz: 0, rx: Math.max(r, bodyR + 0.15), rz: Math.max(r, bodyR + 0.15) });
      }
      addMesh(g, loft(rings, false, false), mat(color, 0.9));
    });
  }

  /* data = { body:{height,chest,shoulder,waist,hip,thigh,arm,inseam,rise,foot}, garments:[{cat:'top'|'bottom', heat, chest,shoulder,length,sleeve | waist,hip,thigh,rise,inseam (둘레 cm)}] } */
  function build(data) {
    var v = data.body;
    if (!v || !v.height) return;
    var key = JSON.stringify(data);
    if (key === S.key) return;
    S.key = key;
    var old = S.group;
    if (old) { S.scene.remove(old); old.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    var g = new T.Group(), b = bodyModel(v);
    buildBody(g, v, b);
    (data.garments || []).forEach(function (gar) { if (gar.cat === 'top') buildTop(g, v, b, gar); else if (gar.cat === 'bottom') buildBottom(g, v, b, gar); });
    g.rotation.y = old ? old.rotation.y : S.rotY;
    S.group = g; S.scene.add(g);
    S.camH = v.height;
    frame();
  }
  function frame() {
    if (!S.camera || !S.camH) return;
    var H = S.camH, fov = S.camera.fov * Math.PI / 180, dist = (H * 0.64) / Math.tan(fov / 2);
    S.camera.position.set(0, H * 0.5, dist); S.camera.lookAt(0, H * 0.47, 0);
  }

  function ensure() {
    if (S.ok !== null) return S.ok;
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!T || !gl) { S.ok = false; return false; }
      S.renderer = new T.WebGLRenderer({ canvas: c, context: gl, antialias: true, alpha: true });
      S.renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      S.scene = new T.Scene();
      S.camera = new T.PerspectiveCamera(32, 1, 5, 2000);
      S.scene.add(new T.HemisphereLight(0xffffff, 0x8a8f99, 0.9));
      var dl = new T.DirectionalLight(0xffffff, 0.8); dl.position.set(80, 220, 160); S.scene.add(dl);
      var floor = new T.Mesh(new T.CircleGeometry(60, 40), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; S.scene.add(floor);
      c.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
      c.addEventListener('pointerdown', function (e) { S.drag = true; S.lastX = e.clientX; try { c.setPointerCapture(e.pointerId); } catch (x) {} });
      c.addEventListener('pointermove', function (e) { if (!S.drag || !S.group) return; S.group.rotation.y += (e.clientX - S.lastX) * 0.012; S.lastX = e.clientX; S.spinAt = Date.now() + 3500; });
      var end = function () { S.drag = false; S.spinAt = Date.now() + 3500; };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
      S.ok = true;
    } catch (e) { S.ok = false; }
    return S.ok;
  }
  function resize() {
    if (!S.host || !S.renderer) return;
    var w = S.host.clientWidth || 360, h = S.host.clientHeight || 640;
    S.renderer.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
  }
  function loop() {
    if (!S.host || !S.host.isConnected) { S.raf = 0; return; }
    if (S.group && !S.drag && Date.now() > S.spinAt) S.group.rotation.y += 0.006;
    S.renderer.render(S.scene, S.camera);
    S.raf = requestAnimationFrame(loop);
  }
  function mount(host, data) {
    if (!ensure()) return false;
    S.host = host; host.appendChild(S.renderer.domElement);
    resize(); S.key = ''; build(data);
    if (!S.raf) S.raf = requestAnimationFrame(loop);
    return true;
  }
  function update(data) { if (S.ok && S.host) build(data); }
  function front() { if (S.group) { S.group.rotation.y = 0; S.spinAt = Date.now() + 4000; } }
  function pause() { if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } S.host = null; }
  root.addEventListener('resize', function () { resize(); });

  root.Fit3D = { mount: mount, update: update, pause: pause, front: front, supported: function () { return ensure(); }, heat: HEAT };
})(window);
