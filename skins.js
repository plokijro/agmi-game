// Agmi – wyglądy klocków (30) i plansz (20). Wszystko rysowane kodem, bez zewnętrznych plików.
(function (root) {
  'use strict';

  // ---------- pomocnicze ----------
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(hex, a) {
    let [r, g, b] = rgb(hex);
    if (a >= 0) { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; } else { r *= 1 + a; g *= 1 + a; b *= 1 + a; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function alpha(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const rad = (g, x, y, r0, r1, stops, x1 = x, y1 = y) => { const gr = g.createRadialGradient(x, y, r0, x1, y1, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
  const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => g.lineTo(p[0], p[1])); g.closePath(); g.fill(); };
  const circle = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  function bevel(g, s, base, k = 0.13, amt = 1) {
    const i = s * k;
    poly(g, [[0, 0], [s, 0], [s - i, i], [i, i]], shade(base, 0.35 * amt));
    poly(g, [[0, 0], [i, i], [i, s - i], [0, s]], shade(base, 0.15 * amt));
    poly(g, [[s, 0], [s, s], [s - i, s - i], [s - i, i]], shade(base, -0.15 * amt));
    poly(g, [[0, s], [i, s - i], [s - i, s - i], [s, s]], shade(base, -0.32 * amt));
  }
  function starPath(g, cx, cy, r1, r2, n = 5, rot = -Math.PI / 2) {
    g.beginPath();
    for (let k = 0; k < n * 2; k++) { const r = k % 2 ? r2 : r1, a = rot + k * Math.PI / n; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  }
  function heartPath(g, cx, cy, r) {
    g.beginPath(); g.moveTo(cx, cy + r * 0.9);
    g.bezierCurveTo(cx - r * 1.3, cy + r * 0.1, cx - r * 0.9, cy - r * 0.95, cx, cy - r * 0.35);
    g.bezierCurveTo(cx + r * 0.9, cy - r * 0.95, cx + r * 1.3, cy + r * 0.1, cx, cy + r * 0.9);
    g.closePath();
  }
  function hexPath(g, cx, cy, r) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }
  function leafPath(g, cx, cy, len, wid, ang) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -wid, len / 2, 0); g.quadraticCurveTo(0, wid, -len / 2, 0); g.closePath();
    g.restore();
  }
  function mapleLeaf(g, cx, cy, r, ang, col) {
    g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = col;
    starPath(g, 0, 0, r, r * 0.45, 5); g.fill();
    g.strokeStyle = col; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, r * 1.2); g.stroke();
    g.restore();
  }

  // ---------- KLOCKI ----------
  // draw(g, s, col, idx): s = bok kwadratu, col = kolor z palety, idx = numer koloru (0–6)
  const blocks = [
    { name: 'Klasyczne', colors: ['#1aa8b0', '#e84061', '#fabd29', '#8f5edb', '#f8822e', '#54c454', '#3d85f0'],
      draw(g, s, c) { rr(g, 0, 0, s, s, s * 0.08); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s); bevel(g, s, c); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(s * 0.13, s * 0.13, s * 0.74, s * 0.33); } },

    { name: 'Cukierki', colors: ['#ff5c8a', '#ffb03b', '#7bd84a', '#3fc5f0', '#b46cf5', '#ff7a45', '#f5e04a'],
      draw(g, s, c) {
        rr(g, s * 0.03, s * 0.03, s * 0.94, s * 0.94, s * 0.3); g.fillStyle = lin(g, 0, 0, 0, s, [[0, shade(c, 0.3)], [0.55, c], [1, shade(c, -0.25)]]); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(s * 0.4, s * 0.25, s * 0.26, s * 0.11, -0.25, 0, Math.PI * 2); g.fill();
        circle(g, s * 0.75, s * 0.72, s * 0.06, 'rgba(255,255,255,0.4)');
      } },

    { name: 'Klejnoty', colors: ['#e0115f', '#1f5fd6', '#2fbf6f', '#9966cc', '#ffbf00', '#26c6d0', '#ff6f3c'],
      draw(g, s, c) {
        const i = s * 0.24;
        poly(g, [[0, 0], [s, 0], [s - i, i], [i, i]], shade(c, 0.45));
        poly(g, [[0, 0], [i, i], [i, s - i], [0, s]], shade(c, 0.15));
        poly(g, [[s, 0], [s, s], [s - i, s - i], [s - i, i]], shade(c, -0.25));
        poly(g, [[0, s], [i, s - i], [s - i, s - i], [s, s]], shade(c, -0.45));
        g.fillStyle = lin(g, i, i, s - i, s - i, [[0, shade(c, 0.3)], [1, shade(c, -0.1)]]); g.fillRect(i, i, s - 2 * i, s - 2 * i);
        g.fillStyle = 'rgba(255,255,255,0.85)'; starPath(g, s * 0.33, s * 0.33, s * 0.11, s * 0.03, 4, 0); g.fill();
      } },

    { name: 'Galaretki', colors: ['#ff4f6d', '#ff9f1c', '#ffe347', '#4cd964', '#2ec4ff', '#7b61ff', '#ff5ccf'],
      draw(g, s, c) {
        rr(g, s * 0.04, s * 0.06, s * 0.92, s * 0.9, s * 0.26); g.fillStyle = rad(g, s * 0.45, s * 0.4, s * 0.05, s * 0.7, [[0, shade(c, 0.45)], [0.6, c], [1, shade(c, -0.3)]]); g.fill();
        g.lineWidth = s * 0.04; g.strokeStyle = shade(c, -0.25); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, s * 0.2, s * 0.15, s * 0.5, s * 0.12, s * 0.06); g.fill();
        circle(g, s * 0.72, s * 0.6, s * 0.06, 'rgba(255,255,255,0.35)'); circle(g, s * 0.62, s * 0.74, s * 0.035, 'rgba(255,255,255,0.3)');
      } },

    { name: 'Neon', colors: ['#ff2bd6', '#00f0ff', '#39ff14', '#ffe600', '#ff6a00', '#b026ff', '#ff2e4d'],
      draw(g, s, c) {
        rr(g, s * 0.06, s * 0.06, s * 0.88, s * 0.88, s * 0.14); g.fillStyle = '#0d0d16'; g.fill();
        g.fillStyle = alpha(c, 0.18); g.fill();
        g.shadowColor = c; g.shadowBlur = s * 0.22; g.lineWidth = s * 0.09; g.strokeStyle = c;
        rr(g, s * 0.12, s * 0.12, s * 0.76, s * 0.76, s * 0.1); g.stroke(); g.stroke();
        g.shadowBlur = 0; g.lineWidth = s * 0.025; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
      } },

    { name: 'Pastele', colors: ['#ffadc4', '#ffd29e', '#f6f08a', '#b9f2a9', '#94ecf5', '#a5c4ff', '#c9b6ff'],
      draw(g, s, c) {
        rr(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.2); g.fillStyle = c; g.fill();
        g.lineWidth = s * 0.07; g.strokeStyle = shade(c, -0.14); rr(g, s * 0.12, s * 0.12, s * 0.76, s * 0.76, s * 0.14); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = s * 0.05; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 0.25, s * 0.24); g.lineTo(s * 0.5, s * 0.24); g.stroke();
      } },

    { name: 'Malowane drewno', colors: ['#b5552f', '#2f7fb5', '#3f9a4a', '#c9a227', '#8a4fb0', '#d0782f', '#2a9a96'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.06); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        const R = rng(idx + 11); g.strokeStyle = shade(c, -0.22); g.lineWidth = Math.max(1, s * 0.025);
        for (let k = 0; k < 6; k++) { const y = (k + 0.5) * s / 6 + (R() - 0.5) * s * 0.05; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * 0.3, y + (R() - 0.5) * s * 0.15, s * 0.7, y + (R() - 0.5) * s * 0.15, s, y); g.stroke(); }
        g.fillStyle = shade(c, -0.3); g.beginPath(); g.ellipse(s * (0.3 + R() * 0.4), s * (0.3 + R() * 0.4), s * 0.08, s * 0.05, 0, 0, Math.PI * 2); g.fill();
        bevel(g, s, c, 0.08, 0.8);
      } },

    { name: 'Kamień', colors: ['#8a8f99', '#b0705a', '#6d9b74', '#7b6fae', '#c4a46b', '#5f86ae', '#ae5f72'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.12); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        const R = rng(idx + 21);
        for (let k = 0; k < 45; k++) circle(g, R() * s, R() * s, s * (0.01 + R() * 0.03), R() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.16)');
        g.strokeStyle = shade(c, -0.35); g.lineWidth = Math.max(1, s * 0.02); g.beginPath(); g.moveTo(s * 0.6, s * 0.12); g.lineTo(s * 0.52, s * 0.35); g.lineTo(s * 0.66, s * 0.48); g.stroke();
        bevel(g, s, c, 0.11, 0.9);
      } },

    { name: 'Lód', colors: ['#7fc8ff', '#a8f0ff', '#8fa8ff', '#9ff5d8', '#c7b4ff', '#7fe0e0', '#d8f2ff'],
      draw(g, s, c, idx) {
        rr(g, s * 0.03, s * 0.03, s * 0.94, s * 0.94, s * 0.1); g.fillStyle = lin(g, 0, 0, s, s, [[0, '#ffffff'], [0.35, c], [1, shade(c, -0.3)]]); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = s * 0.04; g.stroke();
        const R = rng(idx + 31); g.lineWidth = Math.max(1, s * 0.018); g.strokeStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); let x = s * (0.3 + R() * 0.3), y = s * 0.2; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - 0.5) * s * 0.3; y += s * 0.15; g.lineTo(x, y); } g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.5)'; poly(g, [[s * 0.15, s * 0.12], [s * 0.45, s * 0.12], [s * 0.15, s * 0.42]], 'rgba(255,255,255,0.35)');
      } },

    { name: 'Lawa', colors: ['#ff4500', '#ff8c00', '#ffd000', '#ff2d55', '#ff6f61', '#ffb347', '#e8175d'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.1); g.clip(); g.fillStyle = lin(g, 0, 0, 0, s, [[0, '#3a1c14'], [1, '#1a0b08']]); g.fillRect(0, 0, s, s);
        const R = rng(idx + 41); g.shadowColor = c; g.shadowBlur = s * 0.15; g.strokeStyle = c; g.lineWidth = s * 0.06; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 2; k++) { g.beginPath(); let x = R() * s * 0.2, y = s * (0.2 + R() * 0.6); g.moveTo(x, y); while (x < s) { x += s * (0.15 + R() * 0.15); y += (R() - 0.5) * s * 0.35; g.lineTo(x, y); } g.stroke(); }
        g.shadowBlur = 0; g.lineWidth = s * 0.02; g.strokeStyle = 'rgba(255,255,200,0.8)'; g.stroke();
        g.fillStyle = alpha(c, 0.25); g.fillRect(0, s * 0.85, s, s * 0.15);
        bevel(g, s, '#3a1c14', 0.08, 1);
      } },

    { name: 'Metal', colors: ['#d64545', '#3d7fd6', '#3dbb6a', '#d6b13d', '#9b59d0', '#e07b39', '#39b8c4'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.06); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += Math.max(1, s / 22)) { g.fillStyle = (Math.round(y) % 3 === 0) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'; g.fillRect(0, y, s, Math.max(0.5, s / 60)); }
        g.fillStyle = lin(g, 0, 0, s, s, [[0, 'rgba(255,255,255,0.3)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.2)']]); g.fillRect(0, 0, s, s);
        bevel(g, s, c, 0.09, 1);
        [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]].forEach(([x, y]) => { circle(g, x * s, y * s, s * 0.055, shade(c, -0.35)); circle(g, x * s - s * 0.012, y * s - s * 0.012, s * 0.035, shade(c, 0.5)); });
      } },

    { name: 'Szlachetne metale', colors: ['#ffd700', '#c0c0c8', '#cd7f32', '#e8e6f0', '#c76e86', '#b8d43a', '#5fa8d3'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.08); g.clip();
        g.fillStyle = lin(g, 0, 0, s, s, [[0, shade(c, 0.6)], [0.3, c], [0.5, shade(c, -0.35)], [0.7, shade(c, 0.35)], [1, shade(c, -0.2)]]); g.fillRect(0, 0, s, s);
        bevel(g, s, c, 0.1, 0.9);
        g.strokeStyle = shade(c, -0.3); g.lineWidth = s * 0.03; g.strokeRect(s * 0.25, s * 0.25, s * 0.5, s * 0.5);
        g.strokeStyle = shade(c, 0.6); g.lineWidth = s * 0.02; g.strokeRect(s * 0.27, s * 0.27, s * 0.5, s * 0.5);
      } },

    { name: 'Piksele', colors: ['#e40058', '#0058f8', '#00a800', '#f8b800', '#6844fc', '#f87858', '#00b8d8'],
      draw(g, s, c) {
        const p = s / 8; g.fillStyle = c; g.fillRect(0, 0, s, s);
        g.fillStyle = shade(c, 0.45); g.fillRect(0, 0, s, p); g.fillRect(0, 0, p, s);
        g.fillStyle = shade(c, -0.4); g.fillRect(0, s - p, s, p); g.fillRect(s - p, 0, p, s);
        g.fillStyle = '#fff'; g.fillRect(p, p, p, p); g.fillRect(2 * p, p, p, p); g.fillRect(p, 2 * p, p, p);
        g.fillStyle = shade(c, -0.18); g.fillRect(5 * p, 5 * p, p, p); g.fillRect(4 * p, 6 * p, p, p);
      } },

    { name: 'Szkło', colors: ['#ff5d73', '#ffb84d', '#ffe74d', '#5dff9a', '#4dd2ff', '#8f7dff', '#ff7de9'],
      draw(g, s, c) {
        rr(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.12); g.fillStyle = alpha(c, 0.5); g.fill();
        g.lineWidth = s * 0.07; g.strokeStyle = c; g.stroke();
        g.save(); g.clip(); poly(g, [[0, s * 0.55], [s * 0.55, 0], [s * 0.8, 0], [0, s * 0.8]], 'rgba(255,255,255,0.3)'); g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = s * 0.03; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 0.2, s * 0.17); g.lineTo(s * 0.55, s * 0.17); g.stroke();
      } },

    { name: 'Klocki konstrukcyjne', colors: ['#e3000b', '#0057a8', '#00852b', '#ffcd03', '#ff7f00', '#7f3f98', '#00a3da'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.05); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s); bevel(g, s, c, 0.07, 0.8);
        circle(g, s * 0.52, s * 0.55, s * 0.27, shade(c, -0.3));
        g.fillStyle = lin(g, s * 0.3, s * 0.3, s * 0.7, s * 0.7, [[0, shade(c, 0.35)], [1, shade(c, -0.1)]]); g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.26, 0, Math.PI * 2); g.fill();
        circle(g, s * 0.5, s * 0.5, s * 0.19, c);
      } },

    { name: 'Bąbelki', colors: ['#ff6b8b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa', '#f783ac'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.14); g.fillStyle = shade(c, -0.3); g.fill();
        g.fillStyle = rad(g, s * 0.38, s * 0.35, s * 0.03, s * 0.5, [[0, shade(c, 0.6)], [0.5, c], [1, shade(c, -0.15)]]); g.beginPath(); g.arc(s / 2, s / 2, s * 0.43, 0, Math.PI * 2); g.fill();
        circle(g, s * 0.36, s * 0.32, s * 0.08, 'rgba(255,255,255,0.75)');
      } },

    { name: 'Gwiazdki', colors: ['#ff4d6d', '#ff9e00', '#ffd60a', '#38b000', '#00a6fb', '#7209b7', '#f72585'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.12); g.fillStyle = lin(g, 0, 0, 0, s, [[0, shade(c, 0.15)], [1, shade(c, -0.2)]]); g.fill();
        g.fillStyle = shade(c, 0.55); starPath(g, s / 2, s * 0.53, s * 0.34, s * 0.15); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; starPath(g, s / 2, s * 0.5, s * 0.14, s * 0.06); g.fill();
      } },

    { name: 'Serduszka', colors: ['#ff3b6b', '#ff8fab', '#c9184a', '#ff9f43', '#a55eea', '#4bcffa', '#26de81'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.18); g.fillStyle = c; g.fill(); bevel(g, s, c, 0.06, 0.6);
        g.fillStyle = shade(c, 0.5); heartPath(g, s / 2, s * 0.5, s * 0.3); g.fill();
        circle(g, s * 0.4, s * 0.38, s * 0.05, 'rgba(255,255,255,0.8)');
      } },

    { name: 'Paski', colors: ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#3a86ff'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.1); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        g.strokeStyle = shade(c, 0.25); g.lineWidth = s * 0.12; g.beginPath(); for (let k = -1; k <= 1.2; k += 0.34) { g.moveTo(k * s, s); g.lineTo(k * s + s, 0); } g.stroke();
        bevel(g, s, c, 0.08, 0.9);
      } },

    { name: 'Kropki', colors: ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d', '#9b5de5', '#f15bb5'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.12); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]].forEach(([x, y]) => circle(g, x * s, y * s, s * 0.09, 'rgba(255,255,255,0.45)'));
        bevel(g, s, c, 0.07, 0.8);
      } },

    { name: 'Marmur', colors: ['#c94f6d', '#4f7bc9', '#4fa37a', '#c9a14f', '#8a5fc9', '#3a3a44', '#e8e4dc'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.08); g.clip(); g.fillStyle = c; g.fillRect(0, 0, s, s);
        const R = rng(idx + 61), light = idx === 6;
        g.strokeStyle = light ? 'rgba(90,80,70,0.45)' : 'rgba(255,255,255,0.45)';
        for (let k = 0; k < 3; k++) { g.lineWidth = Math.max(0.7, s * (0.01 + R() * 0.025)); g.beginPath(); g.moveTo(-2, R() * s); g.bezierCurveTo(s * 0.3, R() * s, s * 0.6, R() * s, s + 2, R() * s); g.stroke(); }
        g.fillStyle = lin(g, 0, 0, s, s, [[0, 'rgba(255,255,255,0.25)'], [0.5, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s);
        bevel(g, s, c, 0.06, 0.7);
      } },

    { name: 'Kosmos', colors: ['#ff4fd8', '#4fc3ff', '#7dff8a', '#ffd84f', '#a46bff', '#ff7a4f', '#4fffe1'],
      draw(g, s, c, idx) {
        rr(g, s * 0.02, s * 0.02, s * 0.96, s * 0.96, s * 0.14); g.fillStyle = rad(g, s * 0.4, s * 0.4, 0, s * 0.75, [[0, shade(c, 0.2)], [0.45, alpha(c, 0.55)], [1, '#0b0620']]); g.fill();
        g.save(); g.clip(); g.fillStyle = '#0b0620'; g.globalCompositeOperation = 'destination-over'; g.fillRect(0, 0, s, s); g.restore();
        const R = rng(idx + 71); for (let k = 0; k < 9; k++) circle(g, R() * s, R() * s, s * (0.008 + R() * 0.02), 'rgba(255,255,255,0.9)');
        g.lineWidth = s * 0.04; g.strokeStyle = alpha(c, 0.9); rr(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.13); g.stroke();
      } },

    { name: 'Liście', colors: ['#4caf50', '#8bc34a', '#ff9800', '#f44336', '#ffc107', '#a1887f', '#26a69a'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.14); g.fillStyle = shade(c, -0.45); g.fill();
        g.fillStyle = lin(g, 0, 0, s, s, [[0, shade(c, 0.25)], [1, c]]); leafPath(g, s / 2, s / 2, s * 0.95, s * 0.42, -Math.PI / 4); g.fill();
        g.strokeStyle = shade(c, -0.3); g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(s * 0.18, s * 0.82); g.lineTo(s * 0.8, s * 0.2); g.stroke();
        g.lineWidth = s * 0.02; [[0.4, 0.6], [0.55, 0.45]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x * s, y * s); g.lineTo(x * s - s * 0.12, y * s - s * 0.14); g.moveTo(x * s, y * s); g.lineTo(x * s + s * 0.14, y * s + s * 0.12); g.stroke(); });
      } },

    { name: 'Cegły', colors: ['#b3472d', '#6d7a9c', '#c98a3d', '#8a5aac', '#4f9a5f', '#b83a62', '#3a8fb8'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.05); g.clip(); g.fillStyle = shade(c, -0.45); g.fillRect(0, 0, s, s);
        const m = Math.max(1, s * 0.05), h = s / 3, R = rng(idx + 81);
        for (let r = 0; r < 3; r++) {
          const off = r % 2 ? -s / 4 : 0;
          for (let k = -1; k < 3; k++) {
            const x = off + k * s / 2; g.fillStyle = shade(c, (R() - 0.5) * 0.18);
            g.fillRect(x + m / 2, r * h + m / 2, s / 2 - m, h - m);
            g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + m / 2, r * h + m / 2, s / 2 - m, m * 0.6);
          }
        }
      } },

    { name: 'Obwody', colors: ['#00e676', '#00b0ff', '#ffab00', '#e040fb', '#ff3d00', '#c6ff00', '#18ffff'],
      draw(g, s, c, idx) {
        rr(g, s * 0.03, s * 0.03, s * 0.94, s * 0.94, s * 0.1); g.fillStyle = '#0f1a16'; g.fill();
        g.lineWidth = s * 0.05; g.strokeStyle = alpha(c, 0.9); g.stroke();
        const R = rng(idx + 91); g.lineWidth = s * 0.035; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 3; k++) {
          const y = s * (0.25 + k * 0.25), x2 = s * (0.4 + R() * 0.3);
          g.strokeStyle = alpha(c, 0.75); g.beginPath(); g.moveTo(s * 0.12, y); g.lineTo(x2, y); g.lineTo(x2 + s * 0.12, y + (k === 1 ? -s * 0.12 : s * 0.12)); g.stroke();
          circle(g, x2 + s * 0.12, y + (k === 1 ? -s * 0.12 : s * 0.12), s * 0.05, c);
        }
        circle(g, s * 0.8, s * 0.5, s * 0.07, c);
      } },

    { name: 'Plaster miodu', colors: ['#ffb300', '#ff7043', '#9ccc65', '#29b6f6', '#ab47bc', '#ec407a', '#ffee58'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.1); g.clip(); g.fillStyle = shade(c, -0.3); g.fillRect(0, 0, s, s);
        const r = s * 0.22;
        for (let row = -1; row < 4; row++) for (let col = -1; col < 4; col++) {
          const x = col * r * 1.73 + (row % 2 ? r * 0.866 : 0), y = row * r * 1.5;
          g.fillStyle = (row === 1 && col === 1) ? shade(c, 0.35) : c; hexPath(g, x, y, r * 0.88); g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, s, s * 0.3);
      } },

    { name: 'Retro', colors: ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#3d6a86', '#d62828', '#8ab17d'],
      draw(g, s, c) {
        rr(g, 0, 0, s, s, s * 0.1); g.fillStyle = c; g.fill();
        g.fillStyle = '#f5ebd7'; rr(g, s * 0.16, s * 0.16, s * 0.68, s * 0.68, s * 0.08); g.fill();
        g.fillStyle = shade(c, -0.1); rr(g, s * 0.24, s * 0.24, s * 0.52, s * 0.52, s * 0.06); g.fill();
        circle(g, s / 2, s / 2, s * 0.12, '#f5ebd7');
      } },

    { name: 'Kreda', colors: ['#ff8fab', '#8fd3ff', '#b5f28f', '#ffe28f', '#c9a0ff', '#ffb38f', '#8ff2e0'],
      draw(g, s, c, idx) {
        rr(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.08); g.fillStyle = '#2e3b37'; g.fill(); g.fillStyle = alpha(c, 0.22); g.fill();
        const R = rng(idx + 101); g.strokeStyle = c; g.lineCap = 'round';
        for (let k = 0; k < 2; k++) { g.lineWidth = s * (0.05 - k * 0.02); g.beginPath(); const j = () => (R() - 0.5) * s * 0.05; g.moveTo(s * 0.12 + j(), s * 0.12 + j()); g.lineTo(s * 0.88 + j(), s * 0.12 + j()); g.lineTo(s * 0.88 + j(), s * 0.88 + j()); g.lineTo(s * 0.12 + j(), s * 0.88 + j()); g.closePath(); g.stroke(); }
        g.strokeStyle = alpha(c, 0.55); g.lineWidth = s * 0.03; g.beginPath(); for (let k = 0.3; k < 1.5; k += 0.2) { g.moveTo(s * 0.18, s * k * 0.6 + s * 0.1); g.lineTo(s * k * 0.6, s * 0.18); } g.stroke();
      } },

    { name: 'Akwarela', colors: ['#e07a8f', '#6fa8dc', '#93c47d', '#f6b26b', '#8e7cc3', '#f1c232', '#76a5af'],
      draw(g, s, c, idx) {
        rr(g, s * 0.03, s * 0.03, s * 0.94, s * 0.94, s * 0.16); g.fillStyle = '#f8f1e4'; g.fill(); g.save(); g.clip();
        const R = rng(idx + 111);
        for (let k = 0; k < 6; k++) { const x = R() * s, y = R() * s, r = s * (0.3 + R() * 0.35); g.fillStyle = rad(g, x, y, 0, r, [[0, alpha(c, 0.55)], [1, alpha(c, 0)]]); g.fillRect(0, 0, s, s); }
        g.fillStyle = alpha(c, 0.35); g.fillRect(0, 0, s, s);
        g.restore(); g.lineWidth = s * 0.05; g.strokeStyle = alpha(c, 0.8); rr(g, s * 0.05, s * 0.05, s * 0.9, s * 0.9, s * 0.15); g.stroke();
      } },

    { name: 'Buźki', colors: ['#ffd93d', '#ff8c42', '#ff6b6b', '#6bcB77', '#4d96ff', '#c77dff', '#5ce1e6'],
      draw(g, s, c, idx) {
        rr(g, 0, 0, s, s, s * 0.22); g.fillStyle = lin(g, 0, 0, 0, s, [[0, shade(c, 0.2)], [1, shade(c, -0.15)]]); g.fill();
        const ink = '#3a2a2a'; circle(g, s * 0.35, s * 0.42, s * 0.065, ink); circle(g, s * 0.65, s * 0.42, s * 0.065, ink);
        circle(g, s * 0.37, s * 0.4, s * 0.022, '#fff'); circle(g, s * 0.67, s * 0.4, s * 0.022, '#fff');
        circle(g, s * 0.24, s * 0.58, s * 0.06, 'rgba(255,90,120,0.45)'); circle(g, s * 0.76, s * 0.58, s * 0.06, 'rgba(255,90,120,0.45)');
        g.strokeStyle = ink; g.lineWidth = s * 0.05; g.lineCap = 'round'; g.beginPath();
        if (idx % 3 === 1) { circle(g, s * 0.5, s * 0.64, s * 0.07, ink); } else { g.arc(s * 0.5, s * 0.55, s * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
      } },

    { name: 'Origami', colors: ['#e5383b', '#f48c06', '#ffba08', '#2b9348', '#0077b6', '#7b2cbf', '#d63384'],
      draw(g, s, c) {
        poly(g, [[0, 0], [s, 0], [0, s]], shade(c, 0.12));
        poly(g, [[s, 0], [s, s], [0, s]], shade(c, -0.15));
        poly(g, [[s * 0.5, s * 0.5], [s, 0], [s, s]], shade(c, -0.3));
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, s * 0.02); g.beginPath(); g.moveTo(s, 0); g.lineTo(0, s); g.stroke();
      } },
  ];

  // ---------- PLANSZE ----------
  // draw(g, w, c, R): w = bok planszy, c = bok pola, R = losowanie (stałe dla motywu)
  // slot = wygląd pustych pól, page = tło ekranu (góra, dół), frame = ramka planszy
  const boards = [
    { name: 'Grafit', page: ['#1f1f21', '#1f1f21'], frame: '#171719', slot: { fill: '#2b2b30' },
      draw(g, w) { g.fillStyle = '#171719'; g.fillRect(0, 0, w, w); } },

    { name: 'Nocne niebo', page: ['#060a1a', '#18234a'], frame: '#0b1026', slot: { fill: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.09)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#0b1026'], [1, '#22336b']]); g.fillRect(0, 0, w, w);
        for (let k = 0; k < 90; k++) circle(g, R() * w, R() * w, w * (0.002 + R() * 0.004), `rgba(255,255,255,${0.4 + R() * 0.6})`);
        circle(g, w * 0.78, w * 0.2, w * 0.09, '#f6f1c7'); circle(g, w * 0.82, w * 0.17, w * 0.085, '#16225a');
      } },

    { name: 'Ocean', page: ['#0b5d8f', '#032742'], frame: '#063a5e', slot: { fill: 'rgba(0,25,50,0.35)', line: 'rgba(160,220,255,0.12)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#0f6aa3'], [1, '#04304f']]); g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = w * 0.008;
        for (let y = w * 0.05; y < w; y += w * 0.09) { g.beginPath(); for (let x = 0; x <= w; x += w * 0.02) g.lineTo(x, y + Math.sin(x / w * 12 + y) * w * 0.012); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = w * 0.004; for (let k = 0; k < 18; k++) { g.beginPath(); g.arc(R() * w, R() * w, w * (0.006 + R() * 0.015), 0, Math.PI * 2); g.stroke(); }
      } },

    { name: 'Las', page: ['#1b3d24', '#0b1d10'], frame: '#14321c', slot: { fill: 'rgba(0,0,0,0.3)', line: 'rgba(180,255,180,0.08)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#24562f'], [1, '#0f2a17']]); g.fillRect(0, 0, w, w);
        const greens = ['#2e7d32', '#388e3c', '#1b5e20', '#43a047', '#558b2f'];
        for (let k = 0; k < 70; k++) { g.globalAlpha = 0.35 + R() * 0.3; g.fillStyle = greens[k % 5]; leafPath(g, R() * w, R() * w, w * (0.06 + R() * 0.06), w * 0.025, R() * 6.3); g.fill(); }
        g.globalAlpha = 1;
      } },

    { name: 'Zachód słońca', page: ['#ff9966', '#2a1640'], frame: '#4a2050', slot: { fill: 'rgba(30,5,35,0.38)', line: 'rgba(255,200,160,0.12)' },
      draw(g, w) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#ffb067'], [0.45, '#e0607e'], [0.75, '#6a2c70'], [1, '#2a1640']]); g.fillRect(0, 0, w, w);
        g.fillStyle = rad(g, w * 0.5, w * 0.48, 0, w * 0.3, [[0, 'rgba(255,240,170,0.95)'], [0.6, 'rgba(255,200,120,0.6)'], [1, 'rgba(255,200,120,0)']]); g.fillRect(0, 0, w, w);
        g.fillStyle = 'rgba(42,22,64,0.25)'; for (let k = 0; k < 4; k++) g.fillRect(0, w * (0.5 + k * 0.035), w, w * 0.012);
        g.fillStyle = '#2a1640'; g.beginPath(); g.moveTo(0, w); g.lineTo(0, w * 0.72); g.lineTo(w * 0.2, w * 0.6); g.lineTo(w * 0.38, w * 0.74); g.lineTo(w * 0.6, w * 0.58); g.lineTo(w * 0.8, w * 0.72); g.lineTo(w, w * 0.64); g.lineTo(w, w); g.fill();
      } },

    { name: 'Pustynia', page: ['#e3b56e', '#7a4520'], frame: '#8f5a2c', slot: { fill: 'rgba(70,35,10,0.35)', line: 'rgba(255,230,180,0.15)' },
      draw(g, w) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#e8b866'], [1, '#a8642f']]); g.fillRect(0, 0, w, w);
        const dune = (y, a, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, w); g.lineTo(0, y); for (let x = 0; x <= w; x += w * 0.02) g.lineTo(x, y + Math.sin(x / w * Math.PI * 2 + a) * w * 0.05); g.lineTo(w, w); g.fill(); };
        dune(w * 0.3, 0, 'rgba(210,140,70,0.5)'); dune(w * 0.55, 2, 'rgba(180,105,50,0.55)'); dune(w * 0.8, 4, 'rgba(140,75,35,0.55)');
        circle(g, w * 0.82, w * 0.14, w * 0.07, 'rgba(255,245,200,0.8)');
      } },

    { name: 'Zima', page: ['#6f93bd', '#26405f'], frame: '#2f4a6e', slot: { fill: 'rgba(10,30,60,0.38)', line: 'rgba(255,255,255,0.18)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#6c90bb'], [1, '#2f4a6e']]); g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineCap = 'round';
        for (let k = 0; k < 22; k++) { const x = R() * w, y = R() * w, r = w * (0.012 + R() * 0.02); g.lineWidth = r * 0.25; g.beginPath(); for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; g.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r); g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } g.stroke(); }
        for (let k = 0; k < 60; k++) circle(g, R() * w, R() * w, w * 0.004, 'rgba(255,255,255,0.6)');
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(0, w); g.quadraticCurveTo(w * 0.3, w * 0.82, w * 0.6, w * 0.92); g.quadraticCurveTo(w * 0.85, w * 0.85, w, w * 0.9); g.lineTo(w, w); g.fill();
      } },

    { name: 'Sakura', page: ['#4a1f35', '#1f0c18'], frame: '#3a1729', slot: { fill: 'rgba(0,0,0,0.3)', line: 'rgba(255,190,220,0.12)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, w, w, [[0, '#5a2540'], [1, '#24101c']]); g.fillRect(0, 0, w, w);
        g.strokeStyle = '#1a0a12'; g.lineWidth = w * 0.025; g.lineCap = 'round'; g.beginPath(); g.moveTo(-w * 0.05, w * 0.15); g.quadraticCurveTo(w * 0.35, w * 0.1, w * 0.6, w * 0.3); g.moveTo(w * 0.3, w * 0.13); g.quadraticCurveTo(w * 0.4, w * 0.02, w * 0.55, w * 0.0); g.stroke();
        for (let k = 0; k < 55; k++) { g.fillStyle = R() < 0.5 ? 'rgba(255,183,213,0.65)' : 'rgba(255,220,235,0.5)'; leafPath(g, R() * w, R() * w, w * 0.035, w * 0.018, R() * 6.3); g.fill(); }
      } },

    { name: 'Synthwave', page: ['#2a0845', '#0c0218'], frame: '#1a0430', slot: { fill: 'rgba(10,0,25,0.45)', line: 'rgba(255,60,200,0.28)' },
      draw(g, w) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#2d0b4e'], [0.55, '#4a0d5c'], [1, '#0d0220']]); g.fillRect(0, 0, w, w);
        g.save(); g.beginPath(); g.arc(w / 2, w * 0.45, w * 0.22, Math.PI, 0); g.clip();
        g.fillStyle = lin(g, 0, w * 0.23, 0, w * 0.45, [[0, '#ffe56b'], [1, '#ff3d8b']]); g.fillRect(0, 0, w, w);
        g.fillStyle = '#4a0d5c'; for (let k = 0; k < 5; k++) g.fillRect(0, w * (0.33 + k * 0.025), w, w * (0.004 + k * 0.003)); g.restore();
        g.strokeStyle = 'rgba(255,60,210,0.55)'; g.lineWidth = w * 0.004; const hz = w * 0.5;
        for (let k = -8; k <= 8; k++) { g.beginPath(); g.moveTo(w / 2 + k * w * 0.02, hz); g.lineTo(w / 2 + k * w * 0.14, w); g.stroke(); }
        for (let k = 0; k < 8; k++) { const y = hz + Math.pow(k / 8, 1.8) * w * 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      } },

    { name: 'Drewniany stół', page: ['#5a3a22', '#2e1d10'], frame: '#4a2e18', slot: { fill: 'rgba(40,20,5,0.38)', line: 'rgba(255,220,170,0.12)' },
      draw(g, w, c, R) {
        let x = 0; const tones = ['#8a5a33', '#7a4e2c', '#94633a', '#80522f'];
        for (let k = 0; x < w; k++) { const pw = w * (0.12 + R() * 0.08); g.fillStyle = tones[k % 4]; g.fillRect(x, 0, pw, w); g.strokeStyle = 'rgba(60,30,10,0.35)'; g.lineWidth = w * 0.003;
          for (let l = 0; l < 5; l++) { const lx = x + pw * (0.15 + l * 0.18); g.beginPath(); g.moveTo(lx, 0); g.bezierCurveTo(lx + (R() - 0.5) * pw * 0.4, w * 0.3, lx + (R() - 0.5) * pw * 0.4, w * 0.7, lx, w); g.stroke(); }
          g.fillStyle = 'rgba(30,15,5,0.6)'; g.fillRect(x + pw - w * 0.004, 0, w * 0.004, w); x += pw; }
      } },

    { name: 'Kamienna posadzka', page: ['#5d5d66', '#2b2b31'], frame: '#3a3a42', slot: { fill: 'rgba(0,0,0,0.28)', line: 'rgba(255,255,255,0.1)' },
      draw(g, w, c, R) {
        g.fillStyle = '#2b2b30'; g.fillRect(0, 0, w, w);
        const t = c * 2;
        for (let r = 0; r < 4; r++) for (let k = -1; k < 5; k++) {
          const x = k * t + (r % 2 ? t / 2 : 0), y = r * t, v = 0.85 + R() * 0.3;
          g.fillStyle = `rgb(${88 * v | 0},${88 * v | 0},${96 * v | 0})`; rr(g, x + 2, y + 2, t - 4, t - 4, 4); g.fill();
          for (let d = 0; d < 12; d++) circle(g, x + R() * t, y + R() * t, w * 0.003, 'rgba(0,0,0,0.2)');
        }
      } },

    { name: 'Wulkan', page: ['#3a0f08', '#0d0303'], frame: '#200805', slot: { fill: 'rgba(0,0,0,0.42)', line: 'rgba(255,120,40,0.2)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#2a0d08'], [1, '#120403']]); g.fillRect(0, 0, w, w);
        g.shadowColor = '#ff6a00'; g.shadowBlur = w * 0.03; g.strokeStyle = '#ff7a1a'; g.lineWidth = w * 0.008; g.lineJoin = 'round';
        for (let k = 0; k < 9; k++) { g.beginPath(); let x = R() * w, y = R() * w; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (R() - 0.5) * w * 0.2; y += (R() - 0.5) * w * 0.2; g.lineTo(x, y); } g.stroke(); }
        g.shadowBlur = 0; for (let k = 0; k < 40; k++) circle(g, R() * w, R() * w, w * 0.004, `rgba(255,${120 + R() * 100 | 0},40,${0.4 + R() * 0.5})`);
      } },

    { name: 'Zorza polarna', page: ['#04121f', '#0a2a3a'], frame: '#061a28', slot: { fill: 'rgba(255,255,255,0.05)', line: 'rgba(140,255,200,0.12)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#031020'], [1, '#0b2d3d']]); g.fillRect(0, 0, w, w);
        for (let k = 0; k < 80; k++) circle(g, R() * w, R() * w * 0.7, w * 0.003, 'rgba(255,255,255,0.7)');
        const band = (y, col, amp) => { g.strokeStyle = col; g.lineWidth = w * 0.08; g.shadowColor = col; g.shadowBlur = w * 0.06; g.beginPath(); for (let x = -w * 0.1; x <= w * 1.1; x += w * 0.02) g.lineTo(x, y + Math.sin(x / w * 5 + y) * amp); g.stroke(); };
        g.globalAlpha = 0.45; band(w * 0.3, '#3dffa8', w * 0.06); band(w * 0.45, '#8a5cff', w * 0.05); band(w * 0.2, '#2ad4ff', w * 0.04); g.globalAlpha = 1; g.shadowBlur = 0;
        g.fillStyle = '#04101a'; g.beginPath(); g.moveTo(0, w); for (let x = 0; x <= w; x += w * 0.05) g.lineTo(x, w * (0.86 + R() * 0.06)); g.lineTo(w, w); g.fill();
      } },

    { name: 'Cukierkowa', page: ['#8a3f6e', '#3d1530'], frame: '#5a2448', slot: { fill: 'rgba(45,10,35,0.38)', line: 'rgba(255,210,235,0.15)' },
      draw(g, w, c, R) {
        g.fillStyle = '#7a3b5e'; g.fillRect(0, 0, w, w);
        g.strokeStyle = '#924a72'; g.lineWidth = w * 0.05; g.beginPath(); for (let k = -1; k <= 2; k += 0.12) { g.moveTo(k * w, w); g.lineTo(k * w + w, 0); } g.stroke();
        const cols = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#ffffff', '#f78c6b'];
        for (let k = 0; k < 70; k++) { g.save(); g.translate(R() * w, R() * w); g.rotate(R() * 6.3); g.fillStyle = cols[k % 6]; rr(g, -w * 0.012, -w * 0.004, w * 0.024, w * 0.008, w * 0.004); g.fill(); g.restore(); }
      } },

    { name: 'Tablica', page: ['#3a2a1a', '#1d140c'], frame: '#7a5230', slot: { fill: 'rgba(0,0,0,0.16)', line: 'rgba(255,255,255,0.14)' },
      draw(g, w, c, R) {
        g.fillStyle = '#2f4a3a'; g.fillRect(0, 0, w, w);
        for (let k = 0; k < 300; k++) circle(g, R() * w, R() * w, w * 0.003, 'rgba(255,255,255,0.03)');
        g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = w * 0.006; g.lineCap = 'round';
        starPath(g, w * 0.2, w * 0.2, w * 0.06, w * 0.025); g.stroke();
        g.beginPath(); for (let a = 0; a < 12; a += 0.2) g.lineTo(w * 0.75 + Math.cos(a) * a * w * 0.008, w * 0.7 + Math.sin(a) * a * w * 0.008); g.stroke();
        heartPath(g, w * 0.25, w * 0.75, w * 0.05); g.stroke();
        g.font = `${w * 0.07}px "Comic Sans MS", "Chalkboard SE", sans-serif`; g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillText('2+2=4', w * 0.55, w * 0.25);
      } },

    { name: 'Galaktyka', page: ['#0a0418', '#000000'], frame: '#0a0418', slot: { fill: 'rgba(255,255,255,0.05)', line: 'rgba(200,160,255,0.12)' },
      draw(g, w, c, R) {
        g.fillStyle = '#05020c'; g.fillRect(0, 0, w, w);
        [[0.3, 0.35, '#7b2cbf'], [0.7, 0.6, '#1e6fd9'], [0.45, 0.75, '#d6336c']].forEach(([x, y, col]) => { g.fillStyle = rad(g, x * w, y * w, 0, w * 0.45, [[0, alpha(col, 0.55)], [1, alpha(col, 0)]]); g.fillRect(0, 0, w, w); });
        for (let k = 0; k < 140; k++) circle(g, R() * w, R() * w, w * (0.001 + R() * 0.004), `rgba(255,255,255,${0.3 + R() * 0.7})`);
        circle(g, w * 0.8, w * 0.18, w * 0.06, '#e8a35a'); g.strokeStyle = 'rgba(255,220,170,0.7)'; g.lineWidth = w * 0.008; g.beginPath(); g.ellipse(w * 0.8, w * 0.18, w * 0.11, w * 0.03, -0.3, 0, Math.PI * 2); g.stroke();
      } },

    { name: 'Głębina', page: ['#03424f', '#00151a'], frame: '#022a33', slot: { fill: 'rgba(0,0,0,0.3)', line: 'rgba(120,255,240,0.1)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#05505e'], [1, '#011a20']]); g.fillRect(0, 0, w, w);
        g.fillStyle = 'rgba(255,255,255,0.05)'; for (let k = 0; k < 5; k++) { const x = R() * w; poly(g, [[x, 0], [x + w * 0.08, 0], [x + w * 0.25, w], [x + w * 0.12, w]], 'rgba(255,255,255,0.04)'); }
        g.lineCap = 'round'; for (let k = 0; k < 9; k++) { const x0 = R() * w, hh = w * (0.25 + R() * 0.35); g.strokeStyle = R() < 0.5 ? 'rgba(40,160,110,0.55)' : 'rgba(30,120,130,0.55)'; g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(x0, w); for (let y = 0; y < hh; y += w * 0.02) g.lineTo(x0 + Math.sin(y / w * 18 + k) * w * 0.025, w - y); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = w * 0.003; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(R() * w, R() * w, w * (0.005 + R() * 0.01), 0, Math.PI * 2); g.stroke(); }
      } },

    { name: 'Jesień', page: ['#6a3518', '#2a1408'], frame: '#4a2410', slot: { fill: 'rgba(0,0,0,0.3)', line: 'rgba(255,200,140,0.12)' },
      draw(g, w, c, R) {
        g.fillStyle = lin(g, 0, 0, 0, w, [[0, '#5a2e14'], [1, '#2e170a']]); g.fillRect(0, 0, w, w);
        const cols = ['#e85d04', '#f48c06', '#dc2f02', '#ffba08', '#9d0208', '#c46a1b'];
        for (let k = 0; k < 40; k++) { g.globalAlpha = 0.5 + R() * 0.3; mapleLeaf(g, R() * w, R() * w, w * (0.025 + R() * 0.025), R() * 6.3, cols[k % 6]); }
        g.globalAlpha = 1;
      } },

    { name: 'Czarny marmur', page: ['#26262e', '#0e0e12'], frame: '#b8933d', slot: { fill: 'rgba(255,255,255,0.05)', line: 'rgba(212,175,55,0.25)' },
      draw(g, w, c, R) {
        g.fillStyle = '#1a1a20'; g.fillRect(0, 0, w, w);
        for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(255,255,255,${0.08 + R() * 0.15})`; g.lineWidth = w * (0.002 + R() * 0.006); g.beginPath(); g.moveTo(-10, R() * w); g.bezierCurveTo(w * 0.3, R() * w, w * 0.7, R() * w, w + 10, R() * w); g.stroke(); }
        g.strokeStyle = 'rgba(212,175,55,0.35)'; g.lineWidth = w * 0.003; g.beginPath(); g.moveTo(-10, w * 0.6); g.bezierCurveTo(w * 0.4, w * 0.4, w * 0.6, w * 0.9, w + 10, w * 0.5); g.stroke();
      } },

    { name: 'Płytka drukowana', page: ['#0d4a26', '#03170b'], frame: '#c9a24a', slot: { fill: 'rgba(0,0,0,0.3)', line: 'rgba(120,255,160,0.15)' },
      draw(g, w, c, R) {
        g.fillStyle = '#0b3d1f'; g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(80,200,120,0.4)'; g.lineWidth = w * 0.006; g.lineCap = 'round'; g.lineJoin = 'round';
        for (let k = 0; k < 22; k++) { let x = Math.round(R() * 16) * w / 16, y = Math.round(R() * 16) * w / 16; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 3; s++) { if (R() < 0.5) x += (R() < 0.5 ? -1 : 1) * w * 0.12; else y += (R() < 0.5 ? -1 : 1) * w * 0.12; g.lineTo(x, y); } g.stroke(); circle(g, x, y, w * 0.01, 'rgba(220,180,80,0.7)'); }
      } },
  ];

  // puste pola rysowane na tle planszy
  function drawSlots(g, w, c, slot) {
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
      rr(g, k * c + 1, r * c + 1, c - 2, c - 2, c * 0.08); g.fillStyle = slot.fill; g.fill();
      if (slot.line) { g.strokeStyle = slot.line; g.lineWidth = 1; rr(g, k * c + 1.5, r * c + 1.5, c - 3, c - 3, c * 0.08); g.stroke(); }
    }
  }
  function drawBoard(g, ti, w) {
    const th = boards[ti], c = w / 8;
    g.save(); g.beginPath(); g.rect(0, 0, w, w); g.clip(); th.draw(g, w, c, rng(ti + 1000)); g.restore();
    g.save(); drawSlots(g, w, c, th.slot); g.restore();
  }
  function drawBlock(g, si, k, s) {
    const sk = blocks[si], col = sk.colors[((k % 7) + 7) % 7];
    g.save(); g.beginPath(); g.rect(0, 0, s, s); g.clip(); sk.draw(g, s, col, ((k % 7) + 7) % 7); g.restore();
  }

  root.AgmiSkins = { blocks, boards, drawBoard, drawBlock };
})(window);
