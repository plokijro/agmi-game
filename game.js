// Agmi – ekran gry (wersja webowa): rysowanie, przeciąganie, animacje, postacie, menu
(function () {
  'use strict';
  const A = window.Agmi, S = window.Sound;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const overlayEl = document.getElementById('overlay');
  const FONT = '"Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
  const GOLD = '#fac233', FIRE = '#ff8c26';
  const BLOCKS = ['#1aa8b0', '#e84061', '#fabd29', '#8f5edb', '#f8822e', '#54c454', '#3d85f0'];
  const THEMES = [
    { board: '#171719', cell: '#2b2b30', pattern: 'plain' },
    { board: '#0a172b', cell: '#1c2e50', pattern: 'dots' },
    { board: '#0d1f12', cell: '#1d3d24', pattern: 'stripes' },
    { board: '#2b0f17', cell: '#4f1f2e', pattern: 'diamond' },
    { board: '#1c0f2b', cell: '#382152', pattern: 'checker' },
    { board: '#2b200f', cell: '#4a3920', pattern: 'frame' },
    { board: '#0a2427', cell: '#174a4e', pattern: 'dots' },
  ];
  const CHARS = ['malePerson', 'femalePerson', 'maleAdventurer', 'femaleAdventurer', 'robot', 'zombie'];
  const POSES = ['idle', 'run0', 'run1', 'run2', 'jump', 'fall', 'duck', 'cheer0', 'cheer1', 'show', 'shove', 'switch0', 'switch1', 'attack0', 'attack1', 'attack2', 'attackKick', 'slide', 'wide'];
  const FW = 144, FH = 192;
  const sheets = {}; CHARS.forEach(c => { const im = new Image(); im.src = 'characters/' + c + '.png'; sheets[c] = im; });

  const model = new A.Model();
  let themeIndex = 0; try { themeIndex = parseInt(localStorage.getItem('agmi.theme') || '0', 10) || 0; } catch (e) { }
  let cellThemes = new Array(64).fill(themeIndex);

  // ---------- pomocnicze ----------
  const now = () => performance.now() / 1000;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const prog = (t, s, d) => clamp((t - s) / d, 0, 1);
  const easeOut = k => 1 - (1 - k) * (1 - k);
  const easeIn = k => k * k;
  const easeInOut = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const pop = (t, s, up = 0.15, down = 0.08, from = 0.3, peak = 1.15) => { const k = t - s; if (k < 0) return from; if (k < up) return from + (peak - from) * k / up; if (k < up + down) return peak - (peak - 1) * (k - up) / down; return 1; };
  function shade(hex, a) {
    const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (a >= 0) { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; } else { r *= 1 + a; g *= 1 + a; b *= 1 + a; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function linesText(n) { const m10 = n % 10, m100 = n % 100; const w = n === 1 ? 'linię' : (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) ? 'linie' : 'linii'; return n + ' ' + w; }

  // ---------- układ ----------
  let W = 0, H = 0, dpr = 1, cs = 40, bx = 0, by = 0, bw = 320, trayCell = 20, trayY = 0, trayCenters = [], headerMid = 0, margin = 12, scoreY = 0, safeTop = 0, safeBottom = 0;
  const btn = {};
  function readSafe() {
    const d = document.getElementById('safe'); const cs2 = getComputedStyle(d);
    safeTop = parseFloat(cs2.paddingTop) || 0; safeBottom = parseFloat(cs2.paddingBottom) || 0;
  }
  function layout() {
    readSafe();
    dpr = Math.min(3, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const top = safeTop, bottom = H - safeBottom;
    margin = Math.max(12, W * 0.04);
    const headerH = Math.min(150, Math.max(110, H * 0.16)), trayH = Math.max(120, Math.min(W * 0.36, H * 0.2)), badgeRow = 42;
    const availH = (bottom - top) - headerH - trayH - 10 - badgeRow;
    cs = Math.floor(Math.min(W - 2 * margin, availH) / 8); bw = cs * 8;
    const extra = Math.max(0, availH - bw);
    const boardBottom = bottom - (trayH + 10 + badgeRow + extra * 0.4);
    bx = Math.floor((W - bw) / 2); by = Math.floor(boardBottom - bw);
    trayCell = Math.floor(Math.min(cs * 0.55, (W / 3 - 26) / 5));
    trayY = bottom - (trayH / 2 + 4);
    trayCenters = [0, 1, 2].map(i => ({ x: W * (i * 2 + 1) / 6, y: trayY }));
    headerMid = top + 32;
    const gap = Math.max(40, by - (headerMid + 22)); scoreY = by - gap * 0.58;
    btn.restart = { x: W - margin - 20, y: headerMid, r: 22 };
    btn.sound = { x: W - margin - 68, y: headerMid, r: 22 };
    btn.music = { x: W - margin - 116, y: headerMid, r: 22 };
    btn.hint = { x: W / 2, y: by + bw + 6 + 22, r: 22 };
    texCache.clear();
  }

  // ---------- tekstury (rysowane raz, w pamięci podręcznej) ----------
  const texCache = new Map();
  function tex(key, w, h, draw) {
    let c = texCache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const g = c.getContext('2d'); g.scale(dpr, dpr); draw(g, w, h); texCache.set(key, c); return c;
  }
  function blockTex(color, s) {
    return tex('b' + color + '_' + s, s, s, (g) => {
      const base = BLOCKS[((color % 7) + 7) % 7], i = s * 0.13;
      g.beginPath(); g.roundRect(0, 0, s, s, s * 0.08); g.clip();
      g.fillStyle = base; g.fillRect(0, 0, s, s);
      const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); };
      poly([[0, 0], [s, 0], [s - i, i], [i, i]], shade(base, 0.35));
      poly([[0, 0], [i, i], [i, s - i], [0, s]], shade(base, 0.15));
      poly([[s, 0], [s, s], [s - i, s - i], [s - i, i]], shade(base, -0.15));
      poly([[0, s], [i, s - i], [s - i, s - i], [s, s]], shade(base, -0.32));
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(i, i, s - 2 * i, (s - 2 * i) * 0.45);
    });
  }
  function cellTex(ti, s) {
    return tex('e' + ti + '_' + s, s, s, (g) => {
      const th = THEMES[ti];
      g.beginPath(); g.roundRect(1, 1, s - 2, s - 2, s * 0.06); g.fillStyle = th.cell; g.fill(); g.clip();
      const acc = shade(th.cell, 0.12); g.fillStyle = acc; g.strokeStyle = acc;
      if (th.pattern === 'dots') { g.beginPath(); g.arc(s / 2, s / 2, s * 0.09, 0, 7); g.fill(); }
      if (th.pattern === 'stripes') { g.lineWidth = s * 0.08; g.beginPath(); for (let k = -1; k <= 1; k += 0.5) { g.moveTo(k * s, s); g.lineTo(k * s + s, 0); } g.stroke(); }
      if (th.pattern === 'checker') { g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); }
      if (th.pattern === 'diamond') { const d = s * 0.2; g.beginPath(); g.moveTo(s / 2, s / 2 - d); g.lineTo(s / 2 + d, s / 2); g.lineTo(s / 2, s / 2 + d); g.lineTo(s / 2 - d, s / 2); g.fill(); }
      if (th.pattern === 'frame') { g.lineWidth = s * 0.06; g.strokeRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6); }
    });
  }

  // ---------- stan ekranu ----------
  let displayedScore = model.score, comboAlpha = model.combo > 0 ? 1 : 0;
  let drag = null, ghost = null, highlight = null;          // przeciąganie
  let trayAnim = [0, 0, 0];                                   // czas pojawienia się klocków
  let placedPop = new Map();                                  // idx -> t0 (podskok postawionego pola)
  const fx = [];                                              // efekty z własnym czasem
  let parts = [];                                             // cząsteczki
  let shakeUntil = 0, shakeAmp = 0;
  let replay = null;                                          // animacja rozwiązania / podpowiedzi
  let celebration = null;                                     // świętowanie czystej planszy
  let overlayOpen = false;
  const boardShake = () => { const t = now(); return t < shakeUntil ? Math.sin(t * 90) * shakeAmp : 0; };
  function shake(amp, dur = 0.22) { shakeAmp = amp; shakeUntil = now() + dur; }
  function addFx(dur, draw, opts = {}) { const f = Object.assign({ t0: now(), dur, draw }, opts); fx.push(f); return f; }
  function later(sec, fn) { fx.push({ t0: now(), dur: sec, draw: () => { }, onEnd: fn }); }
  const cellCenter = i => ({ x: bx + ((i % 8) + 0.5) * cs, y: by + (Math.floor(i / 8) + 0.5) * cs });

  // ---------- cząsteczki ----------
  function sparks(x, y, delay) { for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2, d = (0.5 + Math.random() * 0.9) * cs; parts.push({ x, y, vx: Math.cos(a) * d / 0.45, vy: Math.sin(a) * d / 0.45, t: -delay - 0.05, life: 0.45, c: 'rgba(255,255,255,0.9)', s: 3 + Math.random() * 3, ease: 1 }); } }
  function burst(x, y, n, r) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; parts.push({ x, y, vx: Math.cos(a) * r / 0.5, vy: Math.sin(a) * r * 0.6 / 0.5, t: 0, life: 0.5, c: BLOCKS[k % 7], s: 6 }); } }
  function firework(x, y) { S.play('pickup'); const col = BLOCKS[Math.floor(Math.random() * 7)]; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, r = cs * (1.4 + Math.random() * 0.8); parts.push({ x, y, vx: Math.cos(a) * r / 0.7, vy: Math.sin(a) * r / 0.7, t: 0, life: 0.7, c: col, s: 5, ease: 1 }); } }
  function confetti() { for (let k = 0; k < 70; k++) parts.push({ x: Math.random() * W, y: -10 - Math.random() * 120, vx: (Math.random() - 0.5) * 60, vy: (H + 160) / 2.2, t: -Math.random() * 0.4, life: 2.2, c: BLOCKS[k % 7], s: 8, conf: 1, rot: Math.random() * 6 }); }
  function drawParts(dt) {
    parts = parts.filter(p => {
      p.t += dt; if (p.t < 0) return true; const k = p.t / p.life; if (k >= 1) return false;
      const e = p.ease ? 1 - (1 - k) * (1 - k) : k;
      const x = p.x + p.vx * (p.ease ? e * p.life : p.t), y = p.y + p.vy * (p.ease && !p.conf ? e * p.life : p.t);
      ctx.globalAlpha = p.conf ? (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1) : 1 - k;
      ctx.save(); ctx.translate(x, y); ctx.rotate((p.rot || 0) + p.t * 5); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.conf ? p.s * 0.55 : p.s); ctx.restore();
      ctx.globalAlpha = 1; return true;
    });
  }

  // ---------- tekst ----------
  function text(s, x, y, size, col, sx = 1, sy = sx, rot = 0, alpha = 1, shadow = true) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.font = `bold ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(s, 3, 3); }
    ctx.fillStyle = col; ctx.fillText(s, 0, 0); ctx.restore();
  }
  function textWidth(s, size) { ctx.font = `bold ${size}px ${FONT}`; return ctx.measureText(s).width; }
  let currentBanner = null;
  function showBanner(lines) {
    const cy = by + cs * 4;
    let maxW = 0; lines.forEach((l, k) => { maxW = Math.max(maxW, textWidth(l, k === 0 ? Math.max(30, cs * 0.85) : Math.max(22, cs * 0.6))); });
    const fit = maxW > W - 30 ? (W - 30) / maxW : 1;
    // tylko jeden duży napis naraz – poprzedni znika
    if (currentBanner && now() - currentBanner.t0 < currentBanner.dur) currentBanner.dur = 0;
    currentBanner = addFx(1.33, t => {
      const sc = t < 0.15 ? 0.3 + 0.82 * t / 0.15 : t < 0.23 ? 1.12 - 0.12 * (t - 0.15) / 0.08 : 1;
      const a = t < 1.03 ? 1 : 1 - (t - 1.03) / 0.3, up = t < 1.03 ? 0 : (t - 1.03) / 0.3 * 20;
      lines.forEach((l, k) => text(l, W / 2, cy - up + k * cs * 0.95, k === 0 ? Math.max(30, cs * 0.85) : Math.max(22, cs * 0.6), k === 0 ? GOLD : '#fff', sc * fit, sc * fit, 0, a));
    });
  }
  function flame(x, y, s, t) {
    const f = 1 + 0.2 * Math.sin(t * 35); ctx.save(); ctx.translate(x, y); ctx.scale(1, f);
    ctx.fillStyle = '#ff8019'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.6, -s * 0.3, s * 0.5, s * 0.4, 0, s * 0.45); ctx.bezierCurveTo(-s * 0.5, s * 0.4, -s * 0.6, -s * 0.3, 0, -s); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(0, -s * 0.35); ctx.bezierCurveTo(s * 0.3, 0, s * 0.25, s * 0.35, 0, s * 0.38); ctx.bezierCurveTo(-s * 0.25, s * 0.35, -s * 0.3, 0, 0, -s * 0.35); ctx.fill(); ctx.restore();
  }
  function crown(x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(-s, s * 0.45); ctx.lineTo(-s, -s * 0.35); ctx.lineTo(-s * 0.5, s * 0.05); ctx.lineTo(0, -s * 0.6); ctx.lineTo(s * 0.5, s * 0.05); ctx.lineTo(s, -s * 0.35); ctx.lineTo(s, s * 0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); [-s, 0, s].forEach((xx, i) => { ctx.moveTo(xx, i === 1 ? -s * 0.6 : -s * 0.35); ctx.arc(xx, i === 1 ? -s * 0.6 : -s * 0.35, s * 0.14, 0, 7); }); ctx.fill(); ctx.restore();
  }

  // ---------- postacie ----------
  function drawToon(ch, pose, x, feetY, h, flip, sx = 1, sy = 1, alpha = 1) {
    const im = sheets[ch]; if (!im || !im.complete || !im.naturalWidth) return;
    const idx = POSES.indexOf(pose), w = h * 0.75;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, feetY); ctx.scale(flip ? -sx : sx, sy);
    ctx.drawImage(im, idx * FW, 0, FW, FH, -w / 2, -h * 0.96, w, h); ctx.restore();
  }
  const runPose = t => 'run' + (Math.floor(t / 0.08) % 3);
  function squashK(t, start, a = 0.18) {
    const k = t - start; if (k < 0 || k > 0.24) return [1, 1];
    if (k < 0.07) { const e = k / 0.07; return [1 + a * e, 1 - a * e]; }
    if (k < 0.16) { const e = (k - 0.07) / 0.09; return [1 + a - 1.5 * a * e, 1 - a + 1.6 * a * e]; }
    const e = (k - 0.16) / 0.08; return [1 - a * 0.5 + a * 0.5 * e, 1 + a * 0.6 - a * 0.6 * e];
  }
  function hopState(t, start, height, landPose) {
    const k = t - start; if (k < 0) return null;
    if (k < 0.08) return { pose: 'duck', dy: 0, sq: [1, 1] };
    if (k < 0.28) return { pose: 'jump', dy: -height * easeOut((k - 0.08) / 0.2), sq: [1, 1] };
    if (k < 0.48) return { pose: 'fall', dy: -height * (1 - easeIn((k - 0.28) / 0.2)), sq: [1, 1] };
    return { pose: landPose, dy: 0, sq: squashK(t, start + 0.48) };
  }

  // ---------- combo ----------
  function comboStyle(c) {
    if (c < 5) return { title: null, color: GOLD, scale: 1 };
    if (c < 10) return { title: 'COMBO', color: '#ff9426', scale: 1.1, flames: 1 };
    if (c < 15) return { title: 'WIELKIE COMBO', color: '#ff5238', scale: 1.2, flames: 1, burst: 1 };
    if (c < 20) return { title: 'SUPER COMBO', color: '#ff4dcc', scale: 1.25, flames: 1, burst: 1 };
    if (c < 30) return { title: 'MEGA COMBO', color: '#ff4dcc', scale: 1.3, flames: 1, burst: 1, rainbow: 1 };
    if (c < 50) return { title: 'ULTRA COMBO', color: '#59d9ff', scale: 1.35, flames: 1, burst: 1, rainbow: 1, shake: 1 };
    if (c < 100) return { title: 'HIPER COMBO', color: '#59d9ff', scale: 1.4, flames: 1, burst: 1, rainbow: 1, shake: 1, fw: 1 };
    return { title: 'LEGENDARNE COMBO', color: GOLD, scale: 1.5, flames: 1, burst: 1, rainbow: 1, shake: 1, fw: 1 };
  }
  const MILESTONES = [5, 10, 15, 20, 30, 50, 100];
  function showCombo(c) {
    const st = comboStyle(c), ms = MILESTONES.includes(c);
    const numSize = Math.max(32, cs) * st.scale, label = st.title ? '×' + c : 'COMBO ×' + c, nw = textWidth(label, numSize);
    const ctxS = { c, st, ms, numSize, label, nw, fired: {}, crew: CHARS.slice().sort(() => Math.random() - 0.5).slice(0, 4) };
    const rx = W / 2, ry0 = by + cs * 1.5;
    S.play('combo'); if (c >= 10) later(0.2, () => S.play('clear' + Math.min(6, 2 + Math.floor(c / 10))));
    if (st.burst) burst(rx, ry0, c >= 20 ? 28 : 16, nw * 0.8);
    if (st.shake) shake(c >= 50 ? 8 : 5);
    if (st.fw) for (let k = 0; k < (c >= 100 ? 5 : 3); k++) later(0.2 + 0.25 * k, () => firework(W * (0.15 + Math.random() * 0.7), by + cs * (1 + Math.random() * 4)));
    const dur = ms ? 2.8 : 1.2;
    addFx(dur + 0.3, t => drawCombo(ctxS, t, dur), { combo: true });
  }
  function drawCombo(o, t, dur) {
    const { c, st, numSize, label, nw, ms } = o;
    const once = (k, fn) => { if (!o.fired[k]) { o.fired[k] = 1; fn(); } };
    const alpha = t > dur ? Math.max(0, 1 - (t - dur) / 0.3) : 1, lift = t > dur ? (t - dur) / 0.3 * 16 : 0;
    const rx = W / 2, ry = by + cs * 1.5 - lift, h = cs * 1.75, leftX = -nw / 2 - h * 0.42, feet = ry + numSize * 0.5;
    const ch = CHARS[Math.floor(c / 5) % 6];
    let col = st.color; if (st.rainbow && t < 1.7) col = BLOCKS[Math.floor(t / 0.07) % 7];
    const num = { x: 0, y: 0, sx: 1, sy: 1, rot: 0, col, show: true };
    ctx.save(); ctx.globalAlpha = alpha;
    if (st.title) text(st.title, rx, ry - numSize * 0.95, numSize * 0.36, '#fff', pop(t, 0, 0.15, 0.08, 0.2));
    if (st.flames && !(ms && (c === 20 || c === 30))) { flame(rx - nw / 2 - numSize * 0.35, ry, numSize * 0.3, t); flame(rx + nw / 2 + numSize * 0.35, ry, numSize * 0.3, t + 0.3); }
    if (!ms) { num.sx = num.sy = pop(t, 0); }

    if (ms && c === 5) {
      const x0 = leftX - W * 0.5; let x = x0 + (leftX - x0) * easeOut(prog(t, 0, 0.45)), pose = t < 0.45 ? runPose(t) : 'idle', scale = 0.25, sq = [1, 1], squashing = false;
      for (let k = 0; k < 3; k++) {
        const pt = 0.45 + k * 0.28;
        if (t >= pt) { pose = ['attack0', 'attack1', 'attack2'][k]; scale = 0.25 + 0.25 * (k + 1); once('p' + k, () => { burst(rx - nw / 2, ry, 8, h * 0.5); S.play('place'); }); }
        const jab = t - pt;
        if (jab >= 0 && jab < 0.17) x = leftX + (jab < 0.05 ? h * 0.12 * jab / 0.05 : h * 0.12 * (1 - (jab - 0.05) / 0.12));
        if (jab >= 0 && jab < 0.06) squashing = true;
      }
      num.sx = num.sy = scale; if (squashing) { num.sx = scale * 1.25; num.sy = scale * 0.8; }
      if (t >= 1.29) num.sx = num.sy = pop(t, 1.29, 0.1, 0.1, 1);
      let dy = 0; const hs = hopState(t, 1.29, h * 0.35, 'cheer0'); if (hs) { pose = hs.pose; dy = hs.dy; sq = hs.sq; } if (t > 1.85) pose = 'cheer1';
      drawToon(ch, pose, rx + x, feet + dy, h, false, sq[0], sq[1]);
    }
    if (ms && c === 10) {
      const startX = -W * 0.5 - nw, k = easeInOut(prog(t, 0, 0.9));
      num.x = startX * (1 - k);
      if (t > 0.9 && t < 0.97) { num.sx = 1.2; num.sy = 0.85; } else if (t >= 0.97 && t < 1.09) { const e = (t - 0.97) / 0.12; num.sx = 1.2 - 0.2 * e; num.sy = 0.85 + 0.15 * e; }
      let tx = startX - nw / 2 - h * 0.3 + (-startX) * k, pose = 'shove', bob = t < 0.9 ? -Math.abs(Math.sin(t * 15)) * h * 0.04 : 0, sq = [1, 1];
      if (t >= 0.9) { pose = 'show'; sq = squashK(t, 0.9, 0.12); tx -= h * 0.25 * prog(t, 0.9, 0.15); once('b', () => burst(rx, ry, 14, nw * 0.8)); }
      drawToon(ch, pose, rx + tx, feet + bob, h, false, sq[0], sq[1]);
    }
    if (ms && c === 15) {
      const gray = '#4d4d4d'; let on = 0; [[0.6, 1], [0.67, 0], [0.75, 1], [0.8, 0], [0.92, 1]].forEach(([ft, v]) => { if (t >= ft) on = v; });
      num.col = on ? col : gray;
      if (t >= 0.92) { once('b', () => { burst(rx, ry, 22, nw); S.play('clear3'); }); num.sx = num.sy = pop(t, 0.92, 0.1, 0.12, 1, 1.25); }
      const lx = rx + leftX + h * 0.22; ctx.fillStyle = '#595959'; ctx.fillRect(lx - h * 0.14, feet - h * 0.16, h * 0.28, h * 0.16);
      const ang = t < 0.45 ? -0.6 : -0.6 + 1.2 * prog(t, 0.45, 0.12); if (t >= 0.45) once('sw', () => S.play('pickup'));
      ctx.save(); ctx.translate(lx, feet - h * 0.14); ctx.rotate(ang); ctx.fillStyle = '#ccc'; ctx.fillRect(-h * 0.02, -h * 0.3, h * 0.04, h * 0.3); ctx.fillStyle = '#e6333f'; ctx.beginPath(); ctx.arc(0, -h * 0.3, h * 0.05, 0, 7); ctx.fill(); ctx.restore();
      let pose = t < 0.45 ? 'switch0' : 'switch1', dy = 0, sq = [1, 1];
      const hs = hopState(t, 1.17, h * 0.3, 'cheer1'); if (hs) { pose = hs.pose; dy = hs.dy; sq = hs.sq; }
      drawToon(ch, pose, rx + leftX - h * 0.2, feet + dy, h, false, sq[0], sq[1]);
    }
    if (ms && c === 20) {
      const tf = ry + numSize * 0.55 + h; let pose = 'idle', dy = 0, sq = [1, 1];
      const hs = hopState(t, 0.25, h * 0.45, 'idle'); if (hs) { pose = hs.pose; dy = hs.dy; sq = hs.sq; }
      if (t > 1.25) pose = t > 1.5 ? 'cheer1' : 'cheer0';
      const k1 = prog(t, 0.5, 0.35), k2 = prog(t, 0.85, 0.35);
      num.y = -h * 0.9 * easeOut(k1) + h * 0.9 * easeIn(k2); num.rot = -Math.PI * (k1 + k2);
      if (t > 1.2 && t < 1.27) { num.sx = 1.25; num.sy = 0.8; } else if (t >= 1.27 && t < 1.39) { const e = (t - 1.27) / 0.12; num.sx = 1.25 - 0.25 * e; num.sy = 0.8 + 0.2 * e; }
      if (t > 0.5) once('b1', () => { burst(rx, ry + numSize * 0.4, 10, h * 0.5); S.play('pickup'); });
      if (t > 1.25) once('b2', () => { burst(rx, ry, 20, nw); S.play('place'); });
      drawToon(ch, pose, rx, tf + dy, h, false, sq[0], sq[1]);
    }
    if (ms && c === 30) {
      const x0 = leftX - W * 0.5, xa = leftX - h * 0.1; let x = x0 + (xa - x0) * prog(t, 0, 0.45), dy = 0, pose = t < 0.45 ? runPose(t) : 'attackKick', sq = [1, 1];
      if (t >= 0.45 && t < 0.55) { const e = prog(t, 0.45, 0.1); x += h * 0.25 * e; dy = -h * 0.15 * e; }
      else if (t >= 0.55 && t < 0.7) { const e = prog(t, 0.55, 0.15); x += h * 0.25 * (1 - e); dy = -h * 0.15 * (1 - e); }
      if (t >= 0.7) { pose = 'idle'; sq = squashK(t, 0.7); }
      const hs = hopState(t, 1.6, h * 0.35, 'cheer1'); if (hs) { pose = hs.pose; dy = hs.dy; sq = hs.sq; }
      if (t >= 0.55) once('kick', () => { burst(rx - nw / 2, ry, 8, h * 0.4); S.play('place'); });
      if (t >= 0.55 && t < 0.95) { const e = easeIn(prog(t, 0.55, 0.4)); num.x = W * e; num.y = -h * 1.2 * e; num.rot = -Math.PI * 3 * e; num.sx = num.sy = 1 - 0.6 * e; }
      else if (t >= 0.95 && t < 1.2) num.show = false;
      else if (t >= 1.2) {
        num.col = '#ff5926'; const e = easeIn(prog(t, 1.2, 0.3)); num.y = -H * 0.5 * (1 - e); num.sx = num.sy = t < 1.5 ? 1 + 0.2 * e : Math.max(1, 1.2 - 0.2 * (t - 1.5) / 0.12);
        if (t >= 1.5) once('land', () => { burst(rx, ry, 24, nw); shake(8); S.play('clear4'); });
        for (let k = 0; k < 5; k++) flame(rx + num.x - nw / 2 + nw * (k + 0.5) / 5, ry + num.y - numSize * 0.5, numSize * 0.22, t + k);
      }
      drawToon(ch, pose, rx + x, feet + dy, h, false, sq[0], sq[1]);
    }
    if (ms && c === 50) {
      const names = [ch, CHARS[(Math.floor(c / 5) + 2) % 6]], moves = ['wide', 'cheer0', 'jump', 'cheer1', 'wide', 'jump'], mi = Math.floor((t - 0.55) / 0.3);
      names.forEach((n, k) => {
        const side = k === 0 ? -1 : 1, fx2 = side * (nw / 2 + h * 0.42);
        let x = fx2 + side * W * 0.5 * (1 - easeOut(prog(t, 0, 0.45))), pose = t < 0.45 ? runPose(t) : 'idle', dy = 0, flip = side > 0, sq = squashK(t, 0.45);
        if (t >= 0.55 && mi < 6) {
          pose = moves[mi]; const lt = (t - 0.55) - mi * 0.3;
          if (pose === 'jump') dy = -h * 0.3 * (lt < 0.12 ? lt / 0.12 : lt < 0.24 ? 1 - (lt - 0.12) / 0.12 : 0); else sq = squashK(t, 0.55 + mi * 0.3, 0.1);
          flip = (mi % 2 === 0) ? side > 0 : side < 0;
        } else if (mi >= 6) pose = 'cheer1';
        drawToon(n, pose, rx + x, feet + dy, h, flip, sq[0], sq[1]);
      });
      if (t >= 0.55 && mi < 6) {
        const lt = (t - 0.55) - mi * 0.3; num.sx = num.sy = lt < 0.06 ? 1 + 0.15 * lt / 0.06 : Math.max(1, 1.15 - 0.15 * (lt - 0.06) / 0.14);
        if (mi % 2 === 1) once('fw' + mi, () => firework(W * (0.2 + Math.random() * 0.6), ry + (Math.random() - 0.3) * cs * 3));
      }
    }
    if (ms && c === 100) {
      num.col = GOLD; const hh = h * 0.9, spacing = Math.min(h * 0.75, W * 0.22), tf = ry + numSize * 0.55 + hh * 0.95;
      o.crew.forEach((n, k) => {
        const fx2 = (k - 1.5) * spacing, d = 0.5 + 0.08 * k; let x = fx2 - W * (1 - easeOut(prog(t, 0, d))), pose = t < d ? runPose(t) : 'idle', dy = 0, sq = squashK(t, d);
        for (let wave = 0; wave < 2; wave++) { const hs = hopState(t, 0.8 + wave * 0.47 + k * 0.09, hh * 0.35, wave === 0 ? 'cheer0' : 'cheer1'); if (hs) { pose = hs.pose; dy = hs.dy; sq = hs.sq; } }
        drawToon(n, pose, rx + x, tf + dy, hh, false, sq[0], sq[1]);
      });
      const dropStart = 1.74, e = easeIn(prog(t, dropStart, 0.35)), cy = (ry - numSize * 0.62) * e + (-60) * (1 - e);
      ctx.save(); ctx.translate(rx, cy); ctx.rotate(t > dropStart + 0.35 ? 0.1 * Math.sin((t - dropStart) * 12) : 0); crown(0, 0, numSize * 0.3, GOLD); ctx.restore();
      if (t > dropStart + 0.35) { once('leg', () => { burst(rx, ry - numSize * 0.52, 24, nw); confetti(); S.play('clear6'); }); text('LEGENDA!', rx, tf + numSize * 0.35, numSize * 0.45, '#fff', pop(t, dropStart + 0.35, 0.15, 0.08, 0.2)); }
    }
    if (num.show) text(label, rx + num.x, ry + num.y, numSize, num.col, num.sx, num.sy, num.rot);
    ctx.restore();
  }

  // ---------- świętowanie czystej planszy ----------
  function celebrate(bannerLines) {
    const words = ['WOW!', 'SUPER!', 'BRAWO!', 'CZYSTO!', 'MISTRZ!', 'EKSTRA!', 'OGIEŃ!'];
    let next = Math.floor(Math.random() * THEMES.length); if (next === themeIndex) next = (next + 1) % THEMES.length;
    celebration = { prev: themeIndex, t0: now(), word: words[Math.floor(Math.random() * words.length)], next, chars: CHARS.slice().sort(() => Math.random() - 0.5), bgSwitched: false };
    themeIndex = next; try { localStorage.setItem('agmi.theme', String(next)); } catch (e) { }
    confetti();
    for (let i = 0; i < 64; i += 2) { const p = cellCenter(i); sparks(p.x, p.y, Math.random() * 0.4 + 0.1); }
    later(0.3, () => S.play('combo'));
    later(1.4, () => showBanner(bannerLines));
  }
  function cancelCelebration() {
    if (!celebration) return;
    cellThemes.fill(celebration.next); celebration = null;
  }
  function drawCelebration() {
    const c = celebration, t = now() - c.t0;
    // okrzyk WOW
    if (t < 1.4) {
      const col = t < 1.12 ? BLOCKS[Math.floor(t / 0.08) % 7] : GOLD;
      const sc = t < 0.18 ? 0.2 + t / 0.18 * 1.05 : t < 0.28 ? 1.25 - (t - 0.18) / 0.1 * 0.25 : t < 1.1 ? 1 : 1 + (t - 1.1) / 0.3 * 0.6;
      const rot = t < 0.28 ? -0.3 + t / 0.28 * 0.3 : t < 0.88 ? 0.06 * Math.sin((t - 0.28) * Math.PI / 0.1) : 0;
      text(c.word, W / 2, by + bw - cs * 5.2, cs * 1.5, col, sc, sc, rot, t < 1.1 ? 1 : 1 - (t - 1.1) / 0.3);
    }
    // 4 postacie przebiegają przez planszę i przemalowują pola
    const walk = 1.5, start = 0.6, h = cs * 1.7; let alive = t < 1.5;
    for (let i = 0; i < 4; i++) {
      const ch = c.chars[i % c.chars.length], ltr = i % 2 === 0, delay = start + i * 0.15;
      const feet = by + (2 * i + 2) * cs - cs * 0.1;
      const xs = ltr ? bx - h * 0.6 : bx + bw + h * 0.6, xe = ltr ? bx + bw + h * 0.6 : bx - h * 0.6;
      const x = xs + (xe - xs) * prog(t, delay, walk);
      for (let col = 0; col < 8; col++) { const cx = bx + (col + 0.5) * cs; if (t >= delay && ((ltr && x >= cx) || (!ltr && x <= cx))) { cellThemes[(2 * i) * 8 + col] = c.next; cellThemes[(2 * i + 1) * 8 + col] = c.next; } }
      if (t < delay) { alive = true; continue; }
      let pose = runPose(t), dy = 0, a = 1; const mid = delay + walk / 2, end = delay + walk;
      if (i % 2 === 0 && t >= mid && t < mid + 0.35) pose = 'slide';
      if (i % 2 === 1 && t >= mid && t < mid + 0.34) { pose = 'jump'; const e = t - mid; dy = -h * 0.35 * (e < 0.17 ? e / 0.17 : 1 - (e - 0.17) / 0.17); }
      if (t >= end) { pose = 'cheer1'; const e = t - end; dy = -h * 0.3 * (e < 0.15 ? e / 0.15 : e < 0.3 ? 1 - (e - 0.15) / 0.15 : 0); a = e < 0.3 ? 1 : Math.max(0, 1 - (e - 0.3) / 0.2); }
      if (a > 0) { alive = true; drawToon(ch, pose, x, feet + dy, h, !ltr, 1, 1, a); }
    }
    if (!alive && t > 2.5) { cellThemes.fill(c.next); celebration = null; }
  }

  // ---------- rysowanie ----------
  function drawHeader() {
    crown(margin + 14, headerMid, 12, '#4059d9');
    ctx.font = `bold 26px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = GOLD;
    ctx.fillText(String(model.highScore), margin + 34, headerMid);
    const icon = (b, s, alpha = 1) => { ctx.globalAlpha = alpha; ctx.font = `22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#d9d9d9'; ctx.fillText(s, b.x, b.y + 1); ctx.globalAlpha = 1; };
    icon(btn.music, '♫', S.musicEnabled ? 1 : 0.3);
    icon(btn.sound, S.enabled ? '🔊' : '🔇');
    icon(btn.restart, '↻');
    if (model.mode === 'hints') { ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,230,128,0.9)'; ctx.fillText('💡 z podpowiedziami', margin, headerMid + 26); }
    const sc = Math.min(56, Math.max(36, cs * 1.2));
    text(String(Math.floor(displayedScore)), W / 2, scoreY, sc, '#fff', 1, 1, 0, 1, false);
    if (replay) text(replay.title, W / 2, by - 16, 17, GOLD, 1, 1, 0, 1, false);
    else if (comboAlpha > 0.01) text('Combo ×' + Math.max(1, model.combo), W / 2, by - 16, 17, GOLD, 1, 1, 0, comboAlpha, false);
  }
  function drawBoard(cells) {
    const sx = boardShake();
    // tło planszy zmienia kolor dopiero, gdy postacie skończą malowanie
    ctx.fillStyle = THEMES[celebration ? (now() - celebration.t0 > 2.7 ? celebration.next : celebration.prev) : themeIndex].board;
    ctx.beginPath(); ctx.roundRect(bx - 6 + sx, by - 6, bw + 12, bw + 12, 10); ctx.fill();
    for (let i = 0; i < 64; i++) { const p = cellCenter(i); ctx.drawImage(cellTex(celebration ? cellThemes[i] : themeIndex, cs), p.x - cs / 2 + sx, p.y - cs / 2, cs, cs); }
    const t = now();
    for (let i = 0; i < 64; i++) {
      if (cells[i] < 0) continue;
      let color = cells[i]; if (highlight && highlight.cells.has(i)) color = highlight.color;
      const p = cellCenter(i); let s = 1; const pt = placedPop.get(i);
      if (pt !== undefined) { const k = t - pt; if (k < 0.1) s = 1.12 - 0.12 * k / 0.1; else placedPop.delete(i); }
      ctx.drawImage(blockTex(color, cs), p.x - cs * s / 2 + sx, p.y - cs * s / 2, cs * s, cs * s);
    }
    if (ghost) for (const i of ghost.cells) {
      const p = cellCenter(i); ctx.globalAlpha = ghost.clear.has(i) ? 0.9 : 0.4;
      ctx.drawImage(blockTex(ghost.color, cs), p.x - cs / 2 + sx, p.y - cs / 2, cs, cs); ctx.globalAlpha = 1;
    }
  }
  function drawPiece(shapeID, color, cx, cy, cell, scale = 1, alpha = 1) {
    const s = A.getShape(shapeID), c = cell * scale;
    ctx.globalAlpha = alpha;
    for (const [r, k] of s.cells) {
      const x = cx + (k - (s.width - 1) / 2) * c, y = cy + (r - (s.height - 1) / 2) * c;
      ctx.drawImage(blockTex(color, Math.round(cell)), x - c / 2, y - c / 2, c, c);
    }
    ctx.globalAlpha = 1;
  }
  function drawTray() {
    const pieces = replay ? replay.pieces : model.tray, t = now();
    pieces.forEach((p, i) => {
      if (!p || (!replay && p.used) || (drag && drag.i === i) || (replay && replay.flying === i)) return;
      const k = easeOut(prog(t, trayAnim[i], 0.3));
      const x = trayCenters[i].x + (1 - k) * W * 0.7;
      drawPiece(p.shapeID, p.color, x, trayCenters[i].y, trayCell, 1, k);
    });
  }
  function drawBadges() {
    if (replay || model.isGameOver) return;
    const y = by + bw + 6 + 22, t = now(), s = 1 + 0.04 * Math.sin(t * Math.PI * 2);
    ctx.save(); ctx.font = `bold 15px ${FONT}`; ctx.textBaseline = 'middle';
    if (model.potentialEmpty) { ctx.textAlign = 'left'; ctx.fillStyle = GOLD; ctx.save(); ctx.translate(bx + 2, y); ctx.scale(s, s); ctx.fillText('✨ Czysta plansza', 0, 0); ctx.restore(); }
    if (model.potentialLines >= 3) {
      const txt = '🔥 ' + (model.roundLinesCleared > 0 ? `${model.roundLinesCleared}/${model.potentialLines} linii` : linesText(model.potentialLines));
      ctx.textAlign = 'right'; ctx.fillStyle = FIRE; ctx.save(); ctx.translate(bx + bw - 2, y); ctx.scale(s, s); ctx.fillText(txt, 0, 0); ctx.restore();
    }
    ctx.restore();
    if (model.mode === 'hints') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(btn.hint.x - 16, btn.hint.y - 14, 32, 28, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💡', btn.hint.x, btn.hint.y + 1);
    }
  }

  let last = now();
  function frame() {
    const t = now(), dt = Math.min(0.05, t - last); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1f1f21'; ctx.fillRect(0, 0, W, H);
    // wynik liczy się płynnie
    if (displayedScore < model.score) displayedScore = Math.min(model.score, displayedScore + Math.max(1, (model.score - displayedScore) * 0.15)); else if (displayedScore > model.score) displayedScore = model.score;
    comboAlpha += ((model.combo > 0 ? 1 : 0) - comboAlpha) * 0.15;
    drawHeader();
    drawBoard(replay ? replay.cells : model.cells);
    drawTray(); drawBadges();
    for (let k = 0; k < fx.length; k++) { const f = fx[k], ft = t - f.t0; if (ft <= f.dur) f.draw(ft); }
    for (let k = fx.length - 1; k >= 0; k--) { const f = fx[k]; if (t - f.t0 > f.dur) { fx.splice(k, 1); if (f.onEnd) f.onEnd(); } }
    if (celebration) drawCelebration();
    if (replay) stepReplay(t);
    drawParts(dt);
    if (drag) { const k = prog(t, drag.t0, 0.1), sc = drag.startScale + (1 - drag.startScale) * k; const p = model.tray[drag.i]; drawPiece(p.shapeID, p.color, drag.cx, drag.cy, cs, sc); }
    requestAnimationFrame(frame);
  }

  // ---------- przeciąganie ----------
  const DRAG_SPEED = 1.4;   // 1 = klocek dokładnie za palcem, więcej = szybciej
  function hit(b, x, y) { return Math.hypot(x - b.x, y - b.y) <= b.r; }
  function pointerDown(e) {
    S.unlock();
    if (overlayOpen || replay) return;
    const x = e.clientX, y = e.clientY;
    if (hit(btn.music, x, y)) { S.toggleMusic(); return; }
    if (hit(btn.sound, x, y)) { S.toggleSound(); return; }
    if (hit(btn.restart, x, y)) { askRestart(); return; }
    if (model.mode === 'hints' && hit(btn.hint, x, y)) { playHint(); return; }
    if (drag || model.isGameOver || y < by + bw + 8) return;
    const slot = clamp(Math.floor(x / (W / 3)), 0, 2), p = model.tray[slot];
    if (!p || p.used) return;
    cancelCelebration();
    const s = A.getShape(p.shapeID);
    drag = { i: slot, lift: cs * (s.height / 2 + 1.3), t0: now(), startScale: trayCell / cs, cx: trayCenters[slot].x, cy: trayCenters[slot].y, target: null, id: e.pointerId, sx: x, sy: y };
    moveDrag(x, y); S.play('pickup');
  }
  function moveDrag(x, y) {
    if (!drag) return;
    // czułość: klocek porusza się szybciej niż palec (jak w podobnych grach), żeby nie trzeba było
    // przesuwać palca przez cały ekran
    drag.cx = clamp(drag.sx + (x - drag.sx) * DRAG_SPEED, 0, W);
    drag.cy = clamp(drag.sy - drag.lift + (y - drag.sy) * DRAG_SPEED, 0, H);
    const p = model.tray[drag.i], s = A.getShape(p.shapeID);
    const tlx = drag.cx - (s.width - 1) / 2 * cs, tly = drag.cy - (s.height - 1) / 2 * cs;
    const col = Math.round((tlx - bx) / cs - 0.5), row = Math.round((tly - by) / cs - 0.5);
    const m = model.placementMask(drag.i, row, col);
    drag.target = m ? { row, col } : null;
    ghost = null; highlight = null;
    if (m) {
      const [lo, hi] = model.bits, ci = A.clearInfo(lo | m[0], hi | m[1]);
      const cells = [], clr = new Set();
      for (let k = 0; k < 64; k++) { if (A.bitIsSet(m[0], m[1], k)) cells.push(k); if (A.bitIsSet(ci.lo, ci.hi, k)) clr.add(k); }
      ghost = { cells, clear: clr, color: p.color };
      if (clr.size) highlight = { cells: clr, color: p.color };
    }
  }
  function upDrag() {
    if (!drag) return;
    const d = drag; drag = null; ghost = null; highlight = null;
    const p = model.tray[d.i];
    if (d.target) {
      const res = model.place(d.i, d.target.row, d.target.col);
      if (res) { applyMove(res); return; }
    }
    // powrót na tacę
    const sx = d.cx, sy = d.cy, id = p.shapeID, color = p.color, i = d.i;
    trayAnim[i] = now() + 10;
    addFx(0.15, t => { const k = t / 0.15; drawPiece(id, color, sx + (trayCenters[i].x - sx) * k, sy + (trayCenters[i].y - sy) * k, cs, 1 - (1 - trayCell / cs) * k); }, { onEnd: () => { trayAnim[i] = 0; } });
  }

  // ---------- ruch ----------
  function applyMove(r) {
    S.play('place');
    const t = now(); let sx = 0, sy = 0;
    r.placed.forEach(i => { placedPop.set(i, t); const p = cellCenter(i); sx += p.x; sy += p.y; });
    const origin = { x: sx / r.placed.length, y: sy / r.placed.length };
    if (r.clear.lines > 0) {
      animateClear(r.clear, origin, r.color, r.placed);
      popup('+' + r.points, origin);
      S.play('clear' + Math.min(6, r.clear.lines + Math.min(2, r.combo - 1)));
      const banner = [];
      if (r.boardCleared) banner.push('CZYSTA PLANSZA!', '+' + r.clearBonus + ' pkt');
      else if (r.clear.lines === 2) banner.push('Świetnie!'); else if (r.clear.lines === 3) banner.push('Wspaniale!'); else if (r.clear.lines >= 4) banner.push('Niesamowite!');
      if (r.comboIncreased && r.combo >= 2) showCombo(r.combo);
      if (r.boardCleared) celebrate(banner); else if (banner.length) showBanner(banner);
    }
    S.setMusic(r.combo);
    if (r.roundEnded) {
      const delay = r.boardCleared ? 3.3 : (r.clear.lines > 0 ? 1.0 : 0.15);
      trayAnim = [1e12, 1e12, 1e12];
      later(0.25, () => { const tt = now(); trayAnim = [tt, tt + 0.07, tt + 0.14]; S.play('newRound'); later(delay, announce); });
    }
    if (r.gameOver) later(1.0, () => showGameOver(true));
  }
  function animateClear(clear, origin, color, placed) {
    const cells = [];
    for (let i = 0; i < 64; i++) if (A.bitIsSet(clear.lo, clear.hi, i)) {
      const p = cellCenter(i), col = placed.includes(i) ? color : (lastColors[i] >= 0 ? lastColors[i] : color);
      const delay = Math.hypot(p.x - origin.x, p.y - origin.y) / cs * 0.03;
      cells.push({ p, col, delay }); sparks(p.x, p.y, delay);
    }
    addFx(0.6, t => {
      for (const c of cells) {
        const k = t - c.delay; if (k > 0.26) continue;
        let s = 1, a = 1, white = 0;
        if (k < 0) { } else if (k < 0.08) { s = 1 + 0.2 * k / 0.08; white = 0.7 * k / 0.08; } else { const e = (k - 0.08) / 0.18; s = 1.2 - 1.1 * e; a = 1 - e; white = 0.7; }
        ctx.globalAlpha = a; ctx.drawImage(blockTex(c.col, cs), c.p.x - cs * s / 2, c.p.y - cs * s / 2, cs * s, cs * s);
        if (white > 0) { ctx.globalAlpha = a * white; ctx.fillStyle = '#fff'; ctx.fillRect(c.p.x - cs * s / 2, c.p.y - cs * s / 2, cs * s, cs * s); }
        ctx.globalAlpha = 1;
      }
    });
  }
  function popup(txt, o) {
    const size = Math.max(22, cs * 0.65);
    addFx(0.92, t => { const sc = t < 0.12 ? 0.5 + 0.5 * t / 0.12 : 1, up = t < 0.12 ? 0 : (t - 0.12) / 0.8 * cs * 1.4, a = t < 0.57 ? 1 : 1 - (t - 0.57) / 0.35; text(txt, o.x, o.y - up, size, '#fff', sc, sc, 0, a); });
  }
  function announce() {
    if (replay || model.isGameOver || overlayOpen) return;
    if (model.potentialEmpty) showBanner(['✨ Możesz wyczyścić', 'całą planszę!']);
    else if (model.potentialLines >= 3) showBanner(['🔥 Gorąca runda!', 'Możesz zbić ' + linesText(model.potentialLines)]);
  }
  // kolory pól sprzed ruchu (do animacji zbijania)
  let lastColors = model.cells.slice();
  const origPlace = model.place.bind(model);
  model.place = function (i, r, c) { lastColors = model.cells.slice(); return origPlace(i, r, c); };

  // ---------- rozwiązanie / podpowiedź ----------
  function startReplay(cells, pieces, steps, isHint, title) {
    cancelCelebration(); hideOverlay();
    replay = { cells: cells.slice(), pieces: pieces.map(p => p ? Object.assign({}, p) : null), steps, isHint, title, k: 0, phase: 'wait', t0: now() + 0.6, flying: -1 };
    trayAnim = [0, 0, 0];
  }
  function stepReplay(t) {
    const r = replay;
    if (r.phase === 'wait') { if (t < r.t0) return; if (r.k >= r.steps.length) { r.phase = 'end'; r.t0 = t + 0.9; return; } r.phase = 'fly'; r.t0 = t; r.flying = r.steps[r.k].piece; S.play('pickup'); return; }
    if (r.phase === 'fly') {
      const st = r.steps[r.k], p = r.pieces[st.piece]; if (!p) { r.phase = 'end'; return; }
      const s = A.getShape(p.shapeID), k = easeInOut(prog(t, r.t0, 0.55));
      const tl = cellCenter(st.row * 8 + st.col), tx = tl.x + (s.width - 1) / 2 * cs, ty = tl.y + (s.height - 1) / 2 * cs, from = trayCenters[st.piece];
      drawPiece(p.shapeID, p.color, from.x + (tx - from.x) * k, from.y + (ty - from.y) * k, cs, trayCell / cs + (1 - trayCell / cs) * k);
      if (k >= 1) {
        const m = A.maskOf(s, st.row, st.col); let sx = 0, sy = 0, n = 0;
        for (let i = 0; i < 64; i++) if (A.bitIsSet(m[0], m[1], i)) { r.cells[i] = p.color; placedPop.set(i, now()); const c = cellCenter(i); sx += c.x; sy += c.y; n++; }
        S.play('place'); r.pieces[st.piece] = null; r.flying = -1;
        const [lo, hi] = A.bitsFromCells(r.cells), ci = A.clearInfo(lo, hi);
        if (ci.lines > 0) {
          lastColors = r.cells.slice();
          for (let i = 0; i < 64; i++) if (A.bitIsSet(ci.lo, ci.hi, i)) r.cells[i] = -1;
          animateClear(ci, { x: sx / n, y: sy / n }, p.color, []);
          S.play('clear' + Math.min(6, ci.lines));
          const empty = r.cells.every(v => v < 0);
          showBanner([empty ? 'CZYSTA PLANSZA!' : linesText(ci.lines) + '!']);
        }
        r.k++; r.phase = 'wait'; r.t0 = t + 0.85;
      }
      return;
    }
    if (r.phase === 'end' && t >= r.t0) {
      const isHint = r.isHint; replay = null;
      if (!isHint) {
        showOverlay([[r.steps.length ? 'Tak można było ukończyć rundę' : 'Brak zapisanego rozwiązania', 20, '#fff'], ['Wynik: ' + model.score, 22, GOLD]],
          [['Pokaż ponownie', '#3d80eb', playSolution], ['Zagraj ponownie', '#33ad66', () => showModePicker(false)]]);
      }
    }
  }
  function playSolution() { startReplay(model.roundStartCells, model.roundPieces, model.solution, false, 'Rozwiązanie rundy'); }
  function playHint() {
    if (drag || model.isGameOver) return;
    const steps = model.bestMoves(); if (!steps.length) return;
    startReplay(model.cells, model.tray.map(p => p.used ? null : p), steps, true, 'Podpowiedź');
  }

  // ---------- nakładki (menu) ----------
  function showOverlay(lines, buttons) {
    overlayOpen = true; overlayEl.innerHTML = '';
    const panel = document.createElement('div'); panel.className = 'panel';
    lines.forEach(([txt, size, color]) => { const d = document.createElement('div'); d.textContent = txt; d.style.fontSize = size + 'px'; d.style.color = color; d.className = 'line'; panel.appendChild(d); });
    buttons.forEach(([label, color, fn]) => { const b = document.createElement('button'); b.textContent = label; b.style.background = color; b.onclick = () => { S.unlock(); fn(); }; panel.appendChild(b); });
    overlayEl.appendChild(panel); overlayEl.classList.add('show');
  }
  function hideOverlay() { overlayOpen = false; overlayEl.classList.remove('show'); overlayEl.innerHTML = ''; }
  function showGameOver(animated) {
    if (!model.isGameOver || replay) return;
    if (animated) S.play('gameOver');
    const record = model.mode === 'classic' && model.score > 0 && model.score >= model.highScore;
    const recTxt = model.mode === 'hints' ? 'Z podpowiedziami – bez rekordu' : (record ? 'Nowy rekord!' : 'Rekord: ' + model.highScore);
    showOverlay([['Koniec gry', 34, '#fff'], ['Wynik: ' + model.score, 24, '#fff'], [recTxt, 20, GOLD]],
      [['Rozwiązanie', '#3d80eb', playSolution], ['Zagraj ponownie', '#33ad66', () => showModePicker(false)]]);
  }
  function askRestart() {
    if (drag) return;
    showOverlay([['Zacząć od nowa?', 28, '#fff'], ['Obecny wynik przepadnie', 17, '#b3b3b3']],
      [['Tak, nowa gra', '#d94554', () => showModePicker(true)], ['Anuluj', '#525252', hideOverlay]]);
  }
  function showModePicker(cancelable) {
    const b = [['Klasyczna', '#33ad66', () => newGame('classic')], ['Z podpowiedziami', '#3d80eb', () => newGame('hints')]];
    if (cancelable) b.push(['Anuluj', '#525252', hideOverlay]);
    showOverlay([['Wybierz tryb gry', 28, '#fff'], ['Wynik z podpowiedziami nie liczy się do rekordu', 13, '#ccc']], b);
  }
  function newGame(mode) {
    hideOverlay(); replay = null; cancelCelebration(); fx.length = 0; parts = [];
    model.newGame(mode); displayedScore = 0; lastColors = model.cells.slice();
    S.setMusic(0); S.play('newRound');
    const t = now(); trayAnim = [t, t + 0.07, t + 0.14];
    later(0.5, announce);
  }

  // ---------- start ----------
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  cv.addEventListener('pointerdown', e => { e.preventDefault(); pointerDown(e); });
  window.addEventListener('pointermove', e => { if (drag) { e.preventDefault(); moveDrag(e.clientX, e.clientY); } }, { passive: false });
  window.addEventListener('pointerup', () => upDrag());
  window.addEventListener('pointercancel', () => { if (drag) { drag.target = null; upDrag(); } });
  document.addEventListener('visibilitychange', () => { if (S.ctx) { if (document.hidden) S.ctx.suspend(); else S.ctx.resume(); } });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  // iPhone uznaje za gest „odblokowujący” dźwięk dopiero puszczenie palca (touchend / click)
  document.addEventListener('touchend', () => S.unlock(), { passive: true });
  document.addEventListener('click', () => S.unlock());

  layout();
  trayAnim = [now(), now() + 0.07, now() + 0.14];
  S.pendingCombo = model.combo;
  if (model.isGameOver) showGameOver(false);
  else if (!model.loadedFromSave) showModePicker(false);
  else later(0.6, announce);
  requestAnimationFrame(frame);
  // dostęp do testów (nie wpływa na grę)
  window.__agmi = { model, geo: () => ({ bx, by, cs, trayCenters, hint: btn.hint }), showCombo, celebrate, showGameOver: () => { model.isGameOver = true; showGameOver(true); } };
})();
