// Agmi – logika gry (wersja webowa). Port 1:1 z wersji Swift.
// Plansza 8x8 = dwie liczby 32-bitowe: lo (wiersze 0–3) i hi (wiersze 4–7). Bit = (r % 4) * 8 + c.
(function (root) {
  'use strict';

  const N = 8, CELLS = 64;

  // ---------- Klocki ----------
  function shape(id, family, kind, rows) {
    const cells = [];
    rows.forEach((line, r) => { for (let c = 0; c < line.length; c++) if (line[c] === 'X') cells.push([r, c]); });
    const height = Math.max(...cells.map(x => x[0])) + 1, width = Math.max(...cells.map(x => x[1])) + 1;
    return { id, family, kind, cells, width, height };
  }
  const STANDARD = [
    shape('O2', 'O2', 'std', ['XX', 'XX']),
    shape('O3', 'O3', 'std', ['XXX', 'XXX', 'XXX']),
    shape('I3H', 'I3', 'std', ['XXX']), shape('I3V', 'I3', 'std', ['X', 'X', 'X']),
    shape('I4H', 'I4', 'std', ['XXXX']), shape('I4V', 'I4', 'std', ['X', 'X', 'X', 'X']),
    shape('I5H', 'I5', 'std', ['XXXXX']), shape('I5V', 'I5', 'std', ['X', 'X', 'X', 'X', 'X']),
    shape('LB1', 'LB', 'std', ['X..', 'X..', 'XXX']), shape('LB2', 'LB', 'std', ['XXX', 'X..', 'X..']),
    shape('LB3', 'LB', 'std', ['XXX', '..X', '..X']), shape('LB4', 'LB', 'std', ['..X', '..X', 'XXX']),
    shape('L1', 'L', 'std', ['X.', 'X.', 'XX']), shape('L2', 'L', 'std', ['XXX', 'X..']),
    shape('L3', 'L', 'std', ['XX', '.X', '.X']), shape('L4', 'L', 'std', ['..X', 'XXX']),
    shape('T1', 'T', 'std', ['XXX', '.X.']), shape('T2', 'T', 'std', ['.X.', 'XXX']),
    shape('T3', 'T', 'std', ['X.', 'XX', 'X.']), shape('T4', 'T', 'std', ['.X', 'XX', '.X']),
    shape('Z1', 'Z', 'std', ['XX.', '.XX']), shape('Z2', 'Z', 'std', ['.X', 'XX', 'X.']),
    shape('S1', 'Z', 'std', ['.XX', 'XX.']), shape('S2', 'Z', 'std', ['X.', 'XX', '.X']),
    shape('SL1', 'SL', 'std', ['X.', 'XX']), shape('SL2', 'SL', 'std', ['XX', 'X.']),
    shape('SL3', 'SL', 'std', ['XX', '.X']), shape('SL4', 'SL', 'std', ['.X', 'XX']),
    shape('R23', 'R', 'std', ['XXX', 'XXX']), shape('R32', 'R', 'std', ['XX', 'XX', 'XX']),
  ];
  const HELPERS = [
    shape('H1', 'H1', 'helper', ['X']),
    shape('H2H', 'H2', 'helper', ['XX']), shape('H2V', 'H2', 'helper', ['X', 'X']),
    shape('D2A', 'D', 'helper', ['X.', '.X']), shape('D2B', 'D', 'helper', ['.X', 'X.']),
  ];
  const ALL = STANDARD.concat(HELPERS);
  const BY_ID = {}; ALL.forEach(s => BY_ID[s.id] = s);
  const FAMILY_TIER = { O2: 1, O3: 1, R: 1, I3: 2, I4: 2, I5: 2, SL: 2, L: 3, LB: 4, T: 5, Z: 5, H1: 1, H2: 1, D: 3 };
  const tierOf = s => FAMILY_TIER[s.family] || 3;
  const getShape = id => BY_ID[id] || HELPERS[0];

  // ---------- Plansza (bity) ----------
  const ROW = [], COLM = [];
  for (let r = 0; r < 8; r++) ROW.push((0xFF << ((r % 4) * 8)) | 0);
  for (let c = 0; c < 8; c++) COLM.push((0x01010101 << c) | 0);

  function pop32(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return (((x + (x >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
  }
  const popcount = (lo, hi) => pop32(lo) + pop32(hi);

  // wynik zbicia w zmiennych modułu (bez alokacji)
  let CL = 0, CH = 0, CN = 0;
  function clearMask(lo, hi) {
    let cl = 0, ch = 0, n = 0;
    for (let r = 0; r < 4; r++) { const m = ROW[r]; if ((lo & m) === m) { cl |= m; n++; } }
    for (let r = 4; r < 8; r++) { const m = ROW[r]; if ((hi & m) === m) { ch |= m; n++; } }
    for (let c = 0; c < 8; c++) { const m = COLM[c]; if ((lo & m) === m && (hi & m) === m) { cl |= m; ch |= m; n++; } }
    CL = cl; CH = ch; CN = n;
  }
  function clearInfo(lo, hi) {
    const rows = [], cols = [];
    for (let r = 0; r < 8; r++) { const m = ROW[r]; if (((r < 4 ? lo : hi) & m) === m) rows.push(r); }
    for (let c = 0; c < 8; c++) { const m = COLM[c]; if ((lo & m) === m && (hi & m) === m) cols.push(c); }
    clearMask(lo, hi);
    return { lo: CL, hi: CH, rows, cols, lines: rows.length + cols.length, cellCount: popcount(CL, CH) };
  }
  function nearFull(lo, hi) {
    let s = 0;
    for (let r = 0; r < 8; r++) { const k = pop32((r < 4 ? lo : hi) & ROW[r]); if (k >= 5) s += k * k; }
    for (let c = 0; c < 8; c++) { const k = pop32(lo & COLM[c]) + pop32(hi & COLM[c]); if (k >= 5) s += k * k; }
    return s;
  }
  const bitIsSet = (lo, hi, i) => i < 32 ? ((lo >>> i) & 1) === 1 : ((hi >>> (i - 32)) & 1) === 1;
  function bitsFromCells(cells) {
    let lo = 0, hi = 0;
    for (let i = 0; i < 64; i++) if (cells[i] >= 0) { if (i < 32) lo |= (1 << i); else hi |= (1 << (i - 32)); }
    return [lo | 0, hi | 0];
  }
  function maskOf(s, row, col) {
    let lo = 0, hi = 0;
    for (const [r, c] of s.cells) { const i = (row + r) * 8 + col + c; if (i < 32) lo |= (1 << i); else hi |= (1 << (i - 32)); }
    return [lo | 0, hi | 0];
  }
  const cache = {};
  function placements(id) {
    if (cache[id]) return cache[id];
    const s = getShape(id), lo = [], hi = [], row = [], col = [];
    for (let r = 0; r + s.height <= N; r++) for (let c = 0; c + s.width <= N; c++) {
      const m = maskOf(s, r, c); lo.push(m[0]); hi.push(m[1]); row.push(r); col.push(c);
    }
    return (cache[id] = { lo, hi, row, col, n: lo.length });
  }
  function canFitAnywhere(lo, hi, id) {
    const p = placements(id);
    for (let k = 0; k < p.n; k++) if ((lo & p.lo[k]) === 0 && (hi & p.hi[k]) === 0) return true;
    return false;
  }

  // klucz stanu planszy do map
  const key = (lo, hi) => lo + ':' + hi;

  // ---------- Solver ----------
  function solve(lo0, hi0, ids, indices, budget = 300000) {
    const n = ids.length; if (n === 0) return [];
    const pls = ids.map(placements);
    const failed = new Map(); const steps = [];
    let left = budget;
    function dfs(lo, hi, rem) {
      if (rem === 0) return true;
      const f = failed.get(rem); if (f && f.has(key(lo, hi))) return false;
      const tried = new Set();
      for (let i = 0; i < n; i++) {
        if (!(rem & (1 << i)) || tried.has(ids[i])) continue;
        tried.add(ids[i]);
        const rest = rem & ~(1 << i), p = pls[i];
        for (let k = 0; k < p.n; k++) {
          if ((lo & p.lo[k]) !== 0 || (hi & p.hi[k]) !== 0) continue;
          if (--left <= 0) return false;
          steps.push({ piece: indices[i], row: p.row[k], col: p.col[k] });
          if (rest === 0) return true;
          const nl = lo | p.lo[k], nh = hi | p.hi[k]; clearMask(nl, nh);
          if (dfs(nl & ~CL, nh & ~CH, rest)) return true;
          steps.pop();
        }
      }
      let s = failed.get(rem); if (!s) failed.set(rem, s = new Set()); s.add(key(lo, hi));
      return false;
    }
    return dfs(lo0, hi0, (1 << n) - 1) && left > 0 ? steps : null;
  }

  // Wszystkie ułożenia (z pamięcią stanów): szansa zbicia, max linii, czy da się wyczyścić, najlepsze ułożenie
  function analyze(lo0, hi0, ids, indices = null, budget = 80000) {
    const n = ids.length, pls = ids.map(placements), memo = new Map();
    let left = budget;
    function f(lo, hi, rem) {
      let mm = memo.get(rem); if (!mm) memo.set(rem, mm = new Map());
      const k0 = key(lo, hi); const known = mm.get(k0); if (known) return known;
      const res = { total: 0, clear: 0, maxLines: -1, empty: false, bestScore: -1, bestPiece: -1, bestRow: 0, bestCol: 0, nLo: 0, nHi: 0 };
      const tried = new Set();
      for (let i = 0; i < n; i++) {
        if (!(rem & (1 << i)) || tried.has(ids[i])) continue;
        tried.add(ids[i]);
        const rest = rem & ~(1 << i), p = pls[i];
        for (let k = 0; k < p.n; k++) {
          if ((lo & p.lo[k]) !== 0 || (hi & p.hi[k]) !== 0) continue;
          if (left <= 0) break;
          left--;
          const nl = lo | p.lo[k], nh = hi | p.hi[k]; clearMask(nl, nh);
          const lines = CN, al = nl & ~CL, ah = nh & ~CH;
          let score = -1;
          if (rest === 0) {
            res.total += 1; if (lines > 0) res.clear += 1;
            res.maxLines = Math.max(res.maxLines, lines);
            if (al === 0 && ah === 0) res.empty = true;
            score = lines + (al === 0 && ah === 0 ? 1000 : 0);
          } else {
            const sub = f(al, ah, rest);
            if (sub.total > 0) {
              res.total += sub.total; res.clear += lines > 0 ? sub.total : sub.clear;
              res.maxLines = Math.max(res.maxLines, lines + sub.maxLines);
              if (sub.empty) res.empty = true;
              if (sub.bestPiece >= 0) score = lines + sub.bestScore;
            }
          }
          if (score > res.bestScore) { res.bestScore = score; res.bestPiece = i; res.bestRow = p.row[k]; res.bestCol = p.col[k]; res.nLo = al; res.nHi = ah; }
        }
      }
      mm.set(k0, res);
      return res;
    }
    const all = (1 << n) - 1, r = f(lo0, hi0, all);
    const idx = indices || ids.map((_, i) => i);
    let steps = [], lo = lo0, hi = hi0, rem = all;
    while (rem !== 0) {
      const mm = memo.get(rem); const node = mm && mm.get(key(lo, hi));
      if (!node || node.bestPiece < 0) break;
      steps.push({ piece: idx[node.bestPiece], row: node.bestRow, col: node.bestCol });
      lo = node.nLo; hi = node.nHi; rem &= ~(1 << node.bestPiece);
    }
    if (steps.length !== n) steps = [];
    const bestEmpties = r.bestScore >= 1000;
    return {
      completions: r.total, clearing: r.clear, maxLines: r.maxLines, canEmpty: r.empty,
      clearRatio: r.total > 0 ? r.clear / r.total : 0, canClear: r.maxLines > 0,
      bestSolution: steps, bestLines: Math.max(0, r.bestScore - (bestEmpties ? 1000 : 0)), bestEmpties,
    };
  }

  // ---------- Poziom trudności ----------
  const THRESHOLDS = [0, 1500, 6000, 20000, 60000];
  const TIER_WEIGHTS = [
    [5.0, 4.0, 2.0, 1.0, 0.6], [4.0, 4.0, 3.0, 2.0, 1.2], [3.0, 3.0, 3.0, 3.0, 2.0],
    [2.0, 2.5, 3.0, 3.5, 3.0], [1.5, 2.0, 3.0, 4.0, 4.0],
  ];
  const BUILDER_PENALTY = [6, 4, 2, 1, 0];
  const HELPER_WEIGHTS = { H1: 3, H2: 4, D: 2 };
  function level(score) { let l = 0; THRESHOLDS.forEach((t, i) => { if (score >= t) l = i; }); return l; }
  function config(l) {
    l = Math.max(0, Math.min(4, l));
    return {
      helperChance: [0.02, 0, 0, 0, 0][l], candidates: 6, pickPosition: [0, 0.25, 0.5, 0.75, 1][l],
      jitter: [false, true, true, true, false][l], emptyBonus: [1, 0.5, 0.25, 0.1, 0][l],
      requireClear: [1, 1, 0.9, 0.7, 0.5][l], great: [0.45, 0.35, 0.3, 0.25, 0.15][l],
      fullClear: [1, 0.9, 0.75, 0.6, 0.45][l], steer: [0.6, 0.5, 0.4, 0.3, 0.2][l], randomPick: l === 4,
    };
  }
  function randomFamilies(l, count) {
    l = Math.max(0, Math.min(4, l));
    const pool = []; const seen = new Set();
    STANDARD.forEach(s => { if (!seen.has(s.family)) { seen.add(s.family); pool.push([s.family, TIER_WEIGHTS[l][tierOf(s) - 1]]); } });
    const chosen = new Set();
    while (chosen.size < count && pool.length) {
      const total = pool.reduce((a, b) => a + b[1], 0); let r = Math.random() * total, idx = pool.length - 1;
      for (let i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r < 0) { idx = i; break; } }
      chosen.add(pool[idx][0]); pool.splice(idx, 1);
    }
    return chosen;
  }
  function randomPiece(helperChance, l) {
    const useHelper = helperChance > 0 && Math.random() < helperChance;
    const pool = useHelper ? HELPERS : STANDARD;
    const sizes = {}; pool.forEach(p => sizes[p.family] = (sizes[p.family] || 0) + 1);
    const ll = Math.max(0, Math.min(4, l));
    const w = pool.map(p => (p.kind === 'helper' ? (HELPER_WEIGHTS[p.family] || 1) : TIER_WEIGHTS[ll][tierOf(p) - 1]) / sizes[p.family]);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i].id; }
    return pool[pool.length - 1].id;
  }

  // ---------- Zestawy „dopasowane” (beam search) ----------
  function beamSearch(lo0, hi0, mode, l, width, families) {
    const shapes = STANDARD, pls = shapes.map(s => placements(s.id));
    const penalty = BUILDER_PENALTY[Math.max(0, Math.min(4, l))];
    let states = [{ score: 0, lo: lo0, hi: hi0, moves: [], code: '', lines: 0 }];
    for (let d = 0; d < 3; d++) {
      const next = new Map();
      for (const st of states) {
        for (let si = 0; si < shapes.length; si++) {
          if (!families.has(shapes[si].family)) continue;
          const codeArr = st.code ? st.code.split(',').map(Number) : [];
          codeArr.push(si); codeArr.sort((a, b) => a - b); const code = codeArr.join(',');
          const p = pls[si];
          for (let k = 0; k < p.n; k++) {
            if ((st.lo & p.lo[k]) !== 0 || (st.hi & p.hi[k]) !== 0) continue;
            const nl = st.lo | p.lo[k], nh = st.hi | p.hi[k]; clearMask(nl, nh);
            const al = nl & ~CL, ah = nh & ~CH, tl = st.lines + CN, cells = popcount(al, ah);
            let sc = mode === 'lines' ? tl * 20 - cells + nearFull(al, ah) * 0.05 : tl * 6 - cells * 3 + nearFull(al, ah) * 0.1;
            if (al === 0 && ah === 0 && tl > 0) sc += 300;
            sc -= (tierOf(shapes[si]) - 1) * penalty;
            sc += Math.random();
            const kk = key(al, ah) + '|' + code;
            const ex = next.get(kk); if (ex && ex.score >= sc) continue;
            next.set(kk, { score: sc, lo: al, hi: ah, moves: st.moves.concat([[si, p.row[k], p.col[k]]]), code, lines: tl });
          }
        }
      }
      if (next.size === 0) return [];
      states = Array.from(next.values()).sort((a, b) => b.score - a.score).slice(0, width);
    }
    return states;
  }
  function makeBuilt(moves, shapesList, lo0, hi0) {
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    const ids = ['', '', '']; const solution = [];
    let lo = lo0, hi = hi0, lines = 0;
    moves.forEach((mv, k) => {
      const s = shapesList[mv[0]]; ids[order[k]] = s.id;
      solution.push({ piece: order[k], row: mv[1], col: mv[2] });
      const m = maskOf(s, mv[1], mv[2]); const nl = lo | m[0], nh = hi | m[1]; clearMask(nl, nh);
      lines += CN; lo = nl & ~CL; hi = nh & ~CH;
    });
    return { ids, solution, lines, empties: lo === 0 && hi === 0 && lines > 0, finalLo: lo, finalHi: hi };
  }
  function build(lo, hi, mode, l) {
    const st = beamSearch(lo, hi, mode, l, 30, randomFamilies(l, 6))[0];
    return st && st.moves.length === 3 ? makeBuilt(st.moves, STANDARD, lo, hi) : null;
  }
  function topSets(lo, hi, l, maxSets) {
    const res = [], seen = new Set();
    for (const st of beamSearch(lo, hi, 'lines', l, 40, randomFamilies(l, 7))) {
      if (seen.has(st.code)) continue; seen.add(st.code);
      if (st.moves.length === 3) res.push(makeBuilt(st.moves, STANDARD, lo, hi));
      if (res.length >= maxSets) break;
    }
    return res;
  }

  // ---------- Czysta plansza (dokładne wyszukiwanie) ----------
  let finishSet = null;
  function getFinishSet() {
    if (finishSet) return finishSet;
    const lines = [];
    for (let r = 0; r < 8; r++) lines.push(r < 4 ? [ROW[r], 0] : [0, ROW[r]]);
    for (let c = 0; c < 8; c++) lines.push([COLM[c], COLM[c]]);
    const unions = [];
    for (let i = 0; i < 16; i++) {
      unions.push(lines[i]);
      for (let j = i + 1; j < 16; j++) {
        unions.push([lines[i][0] | lines[j][0], lines[i][1] | lines[j][1]]);
        for (let k = j + 1; k < 16; k++) unions.push([lines[i][0] | lines[j][0] | lines[k][0], lines[i][1] | lines[j][1] | lines[k][1]]);
      }
    }
    const masks = new Map();
    STANDARD.forEach(s => { const p = placements(s.id); for (let k = 0; k < p.n; k++) masks.set(key(p.lo[k], p.hi[k]), [p.lo[k], p.hi[k]]); });
    const ml = Array.from(masks.values());
    finishSet = new Set();
    for (const u of unions) for (const m of ml) {
      if ((m[0] & ~u[0]) === 0 && (m[1] & ~u[1]) === 0) finishSet.add(key(u[0] & ~m[0], u[1] & ~m[1]));
    }
    return finishSet;
  }
  function findFullClear(lo0, hi0, timeLimitMs) {
    if (lo0 === 0 && hi0 === 0) return null;
    const fin = getFinishSet(), start = performance.now();
    const shapes = STANDARD.slice().sort(() => Math.random() - 0.5);
    const pls = shapes.map(s => placements(s.id));
    const seen = new Set(); let counter = 0;
    for (let a = 0; a < shapes.length; a++) {
      const p1 = pls[a];
      for (let k1 = 0; k1 < p1.n; k1++) {
        if ((lo0 & p1.lo[k1]) !== 0 || (hi0 & p1.hi[k1]) !== 0) continue;
        let nl = lo0 | p1.lo[k1], nh = hi0 | p1.hi[k1]; clearMask(nl, nh);
        const l1 = nl & ~CL, h1 = nh & ~CH;
        if (l1 === 0 && h1 === 0) continue;
        const k1s = key(l1, h1); if (seen.has(k1s)) continue; seen.add(k1s);
        for (let b = 0; b < shapes.length; b++) {
          const p2 = pls[b];
          for (let k2 = 0; k2 < p2.n; k2++) {
            if ((l1 & p2.lo[k2]) !== 0 || (h1 & p2.hi[k2]) !== 0) continue;
            nl = l1 | p2.lo[k2]; nh = h1 | p2.hi[k2]; clearMask(nl, nh);
            const l2 = nl & ~CL, h2 = nh & ~CH;
            if (!fin.has(key(l2, h2))) continue;
            for (let c = 0; c < shapes.length; c++) {
              const p3 = pls[c];
              for (let k3 = 0; k3 < p3.n; k3++) {
                if ((l2 & p3.lo[k3]) !== 0 || (h2 & p3.hi[k3]) !== 0) continue;
                const fl = l2 | p3.lo[k3], fh = h2 | p3.hi[k3]; clearMask(fl, fh);
                if ((fl & ~CL) === 0 && (fh & ~CH) === 0) {
                  return makeBuilt([[STANDARD.indexOf(shapes[a]), p1.row[k1], p1.col[k1]], [STANDARD.indexOf(shapes[b]), p2.row[k2], p2.col[k2]], [STANDARD.indexOf(shapes[c]), p3.row[k3], p3.col[k3]]], STANDARD, lo0, hi0);
                }
              }
            }
          }
        }
        if (++counter % 16 === 0 && performance.now() - start > timeLimitMs) return null;
      }
    }
    return null;
  }

  // ---------- Losowanie rundy ----------
  // pity = premia do szans (w punktach procentowych / 100) za każdą nieudaną próbę danego przypadku:
  // co losowanie bez danego zestawu szansa rośnie o 10 pkt, po jego otrzymaniu wraca do bazowej
  // poziom „normalny”: +10 pkt za każde nietrafienie, losowy zestaw na 60 000+
  // poziom „trudny”: +5 pkt, a na 60 000+ zawsze najtrudniejszy zestaw (za to punkty ×2)
  function generate(lo, hi, score, pity, hard) {
    const PITY_STEP = hard ? 0.05 : 0.1;
    pity = pity || { full: 0, steer: 0, great: 0 };
    const l = level(score), cfg = config(l), start = performance.now(), cells = popcount(lo, hi);
    if (hard) cfg.randomPick = false;
    const miss = k => { pity[k] = Math.min(1, pity[k] + PITY_STEP); }, hit = k => { pity[k] = 0; };
    if (cells > 0 && cells <= 40) {
      if (Math.random() < cfg.fullClear + pity.full) {
        const b = findFullClear(lo, hi, 150);
        if (b) { hit('full'); return { ids: b.ids, solution: b.solution, hintLines: b.lines, hintEmpty: true, kind: 'full' }; }
      }
      miss('full');
    }
    if (cells <= 30) {
      if (Math.random() < cfg.steer + pity.steer) {
        const deadline = performance.now() + 200;
        for (const c of topSets(lo, hi, l, 8)) {
          if (performance.now() > deadline) break;
          if (c.finalLo === 0 && c.finalHi === 0) continue;
          if (findFullClear(c.finalLo, c.finalHi, 50)) { hit('steer'); return { ids: c.ids, solution: c.solution, hintLines: c.lines, hintEmpty: c.empties, kind: 'steer' }; }
        }
      }
      miss('steer');
    }
    if (Math.random() < cfg.great + pity.great) {
      const b = build(lo, hi, 'lines', l);
      if (b && b.lines >= 2) { hit('great'); return { ids: b.ids, solution: b.solution, hintLines: b.lines, hintEmpty: b.empties, kind: 'great' }; }
    }
    miss('great');
    const found = []; let attempts = 0;
    while (attempts < 80 && found.length < cfg.candidates && performance.now() - start < 300) {
      attempts++;
      const ids = [0, 1, 2].map(() => randomPiece(cfg.helperChance, l));
      const sol = solve(lo, hi, ids, [0, 1, 2]); if (!sol) continue;
      found.push({ ids, sol, a: analyze(lo, hi, ids) });
    }
    if (found.length) {
      let pool = found;
      if (Math.random() < cfg.requireClear) { const cl = found.filter(x => x.a.canClear); if (cl.length) pool = cl; }
      const ease = x => x.a.clearRatio + (x.a.canEmpty ? cfg.emptyBonus : 0);
      pool.sort((a, b) => ease(b) - ease(a));
      let idx = Math.round(cfg.pickPosition * (pool.length - 1));
      if (cfg.jitter) idx += Math.floor(Math.random() * 3) - 1;
      if (cfg.randomPick) idx = Math.floor(Math.random() * pool.length);      // najwyższy poziom: po prostu losowy zestaw
      const ch = pool[Math.max(0, Math.min(pool.length - 1, idx))];
      return { ids: ch.ids, solution: ch.a.bestSolution.length ? ch.a.bestSolution : ch.sol, hintLines: Math.max(0, ch.a.maxLines), hintEmpty: ch.a.canEmpty };
    }
    for (const chance of [0.34, 0.67, 1.0]) for (let t = 0; t < 40; t++) {
      const ids = [0, 1, 2].map(() => randomPiece(chance, l));
      const sol = solve(lo, hi, ids, [0, 1, 2]); if (sol) return { ids, solution: sol, hintLines: 0, hintEmpty: false };
    }
    const ids = ['H1', 'H1', 'H1'];
    return { ids, solution: solve(lo, hi, ids, [0, 1, 2]) || [], hintLines: 0, hintEmpty: false };
  }

  // ---------- Model gry ----------
  const SAVE_KEY = 'agmi.save.v1', HIGH_KEY = 'agmi.high';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  };
  const COLORS = 7;

  class Model {
    constructor() {
      this.highScore = parseInt(store.get(HIGH_KEY) || '0', 10) || 0;
      this.mode = 'classic';
      this.loadedFromSave = false;
      if (!this.load()) this.newGame();
    }
    get bits() { return bitsFromCells(this.cells); }
    get mult() { return this.difficulty === 'hard' ? 2 : 1; }
    newGame(mode, difficulty) {
      if (mode) this.mode = mode;
      this.difficulty = this.mode === 'classic' && difficulty === 'hard' ? 'hard' : 'normal';
      this.cells = new Array(64).fill(-1);
      this.score = 0; this.combo = 0; this.roundHadClear = false; this.isGameOver = false; this.round = 0; this.pity = { full: 0, steer: 0, great: 0 };
      this.startNewRound(); this.save();
    }
    startNewRound() {
      this.round++; this.roundHadClear = false; this.roundLinesCleared = 0;
      const [lo, hi] = this.bits;
      if (!this.pity) this.pity = { full: 0, steer: 0, great: 0 };
      const r = generate(lo, hi, this.score, this.pity, this.difficulty === 'hard');
      const colors = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
      this.tray = r.ids.map((id, i) => ({ shapeID: id, color: colors[i], used: false }));
      this.roundStartCells = this.cells.slice();
      this.roundPieces = this.tray.map(p => Object.assign({}, p));
      this.solution = r.solution;
      const a = analyze(lo, hi, r.ids);
      const hintScore = r.hintLines + (r.hintEmpty ? 1000 : 0), aScore = a.bestLines + (a.bestEmpties ? 1000 : 0);
      if (a.bestSolution.length && (aScore > hintScore || !this.solution.length)) this.solution = a.bestSolution;
      this.potentialLines = Math.max(r.hintLines, Math.max(0, a.maxLines));
      this.potentialEmpty = r.hintEmpty || a.canEmpty;
    }
    updatePotential() {
      const rem = this.tray.filter(p => !p.used).map(p => p.shapeID);
      if (!rem.length) { this.potentialLines = this.roundLinesCleared; this.potentialEmpty = false; return; }
      const [lo, hi] = this.bits; const a = analyze(lo, hi, rem, null, 150000);
      this.potentialLines = this.roundLinesCleared + Math.max(0, a.maxLines);
      this.potentialEmpty = a.canEmpty;
    }
    bestMoves() {
      const ids = [], idx = [];
      this.tray.forEach((p, i) => { if (!p.used) { ids.push(p.shapeID); idx.push(i); } });
      if (!ids.length) return [];
      const [lo, hi] = this.bits; return analyze(lo, hi, ids, idx, 200000).bestSolution;
    }
    placementMask(i, row, col) {
      if (this.isGameOver || !this.tray[i] || this.tray[i].used) return null;
      const s = getShape(this.tray[i].shapeID);
      if (row < 0 || col < 0 || row + s.height > 8 || col + s.width > 8) return null;
      const m = maskOf(s, row, col), [lo, hi] = this.bits;
      return (lo & m[0]) === 0 && (hi & m[1]) === 0 ? m : null;
    }
    hasAnyMove() {
      const [lo, hi] = this.bits;
      return this.tray.some(p => !p.used && canFitAnywhere(lo, hi, p.shapeID));
    }
    place(i, row, col) {
      const m = this.placementMask(i, row, col); if (!m) return null;
      const piece = this.tray[i], placed = [];
      for (let k = 0; k < 64; k++) if (bitIsSet(m[0], m[1], k)) { this.cells[k] = piece.color; placed.push(k); }
      piece.used = true;
      const [lo, hi] = this.bits, clear = clearInfo(lo, hi);
      let points = 0, comboIncreased = false;
      if (clear.lines > 0) {
        this.combo++; this.roundHadClear = true; comboIncreased = true;
        points = 5 * clear.lines * clear.cellCount * this.combo * this.mult;
        this.score += points; this.roundLinesCleared += clear.lines;
        for (let k = 0; k < 64; k++) if (bitIsSet(clear.lo, clear.hi, k)) this.cells[k] = -1;
      }
      const after = this.bits, boardCleared = clear.lines > 0 && after[0] === 0 && after[1] === 0;
      let clearBonus = 0;
      if (boardCleared) { clearBonus = 100 * clear.cellCount * Math.max(1, this.combo) * this.mult; this.score += clearBonus; }
      const roundEnded = this.tray.every(p => p.used);
      if (roundEnded) { if (!this.roundHadClear) this.combo = 0; this.startNewRound(); } else this.updatePotential();
      let newHigh = false;
      if (this.mode === 'classic' && this.score > this.highScore) { this.highScore = this.score; newHigh = true; store.set(HIGH_KEY, String(this.highScore)); }
      const gameOver = !this.hasAnyMove(); if (gameOver) this.isGameOver = true;
      this.save();
      return { placed, clear, points, combo: this.combo, comboIncreased, roundEnded, gameOver, newHigh, boardCleared, clearBonus, color: piece.color };
    }
    save() {
      const s = { mode: this.mode, cells: this.cells, tray: this.tray, score: this.score, combo: this.combo, roundHadClear: this.roundHadClear,
        roundStartCells: this.roundStartCells, roundPieces: this.roundPieces, solution: this.solution, gameOver: this.isGameOver, round: this.round,
        potentialLines: this.potentialLines, potentialEmpty: this.potentialEmpty, roundLinesCleared: this.roundLinesCleared, pity: this.pity, difficulty: this.difficulty };
      store.set(SAVE_KEY, JSON.stringify(s));
    }
    load() {
      let s; try { s = JSON.parse(store.get(SAVE_KEY) || 'null'); } catch (e) { s = null; }
      if (!s || s.gameOver || !Array.isArray(s.cells) || s.cells.length !== 64 || !Array.isArray(s.tray) || s.tray.length !== 3) return false;
      if (!s.tray.every(p => BY_ID[p.shapeID])) return false;
      Object.assign(this, { mode: s.mode || 'classic', cells: s.cells, tray: s.tray, score: s.score, combo: s.combo, roundHadClear: s.roundHadClear,
        roundStartCells: s.roundStartCells || s.cells.slice(), roundPieces: s.roundPieces || s.tray, solution: s.solution || [], isGameOver: false,
        round: s.round || 1, potentialLines: s.potentialLines || 0, potentialEmpty: !!s.potentialEmpty, roundLinesCleared: s.roundLinesCleared || 0, pity: s.pity || { full: 0, steer: 0, great: 0 }, difficulty: s.difficulty === 'hard' ? 'hard' : 'normal' });
      if (this.tray.every(p => p.used)) this.startNewRound();
      if (!this.hasAnyMove()) this.isGameOver = true;
      this.loadedFromSave = true;
      return true;
    }
  }

  root.Agmi = { getShape, placements, maskOf, bitIsSet, bitsFromCells, clearInfo, analyze, solve, generate, findFullClear, level, Model, popcount, STANDARD, HELPERS, tierOf };
})(typeof window !== 'undefined' ? window : globalThis);
