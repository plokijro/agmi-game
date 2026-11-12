// Agmi – dźwięki i muzyka (WebAudio, wszystko generowane w kodzie)
(function (root) {
  'use strict';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { } },
  };

  const Sound = {
    ctx: null, sfx: {}, music: {}, cur: null, curLevel: -1, pendingCombo: 0,
    enabled: store.get('agmi.sound', true),
    musicEnabled: store.get('agmi.music', true),

    // iOS pozwala włączyć dźwięk dopiero po dotknięciu ekranu
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
        this.buildSfx();
        if (this.musicEnabled) this.setMusicLevel(this.levelFor(this.pendingCombo), true);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    toggleSound() { this.enabled = !this.enabled; store.set('agmi.sound', this.enabled); },
    toggleMusic() {
      this.musicEnabled = !this.musicEnabled; store.set('agmi.music', this.musicEnabled);
      if (this.musicEnabled) this.setMusicLevel(this.levelFor(this.pendingCombo), true); else this.stopMusic();
    },

    // ---------- efekty ----------
    render(notes) {
      const sr = this.ctx.sampleRate;
      const total = Math.max(...notes.map(n => n[1] + n[2])) + 0.02, n = Math.floor(total * sr);
      const buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
      for (const [f, st, dur, vol] of notes) {
        const s0 = Math.floor(st * sr), len = Math.floor(dur * sr);
        for (let i = 0; i < len && s0 + i < n; i++) {
          const t = i / sr, e = Math.min(1, t / 0.005) * Math.exp(-t * 5 / dur);
          d[s0 + i] += (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * e * vol;
        }
      }
      for (let i = 0; i < n; i++) d[i] = Math.max(-0.95, Math.min(0.95, d[i]));
      return buf;
    },
    buildSfx() {
      const s = this.sfx, R = this.render.bind(this);
      s.pickup = R([[660, 0, 0.06, 0.25]]);
      s.place = R([[220, 0, 0.09, 0.45], [330, 0, 0.07, 0.2]]);
      s.invalid = R([[180, 0, 0.12, 0.3], [150, 0.06, 0.12, 0.3]]);
      const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0, 2093.0];
      for (let l = 1; l <= 6; l++) s['clear' + l] = R(scale.slice(0, Math.min(7, 2 + l)).map((f, i) => [f, i * 0.055, 0.18, 0.28]));
      s.combo = R([[880, 0, 0.1, 0.25], [1174.7, 0.08, 0.1, 0.25], [1760, 0.16, 0.2, 0.25]]);
      s.newRound = R([[440, 0, 0.07, 0.15], [587.3, 0.05, 0.09, 0.15]]);
      s.gameOver = R([[392, 0, 0.25, 0.3], [311.1, 0.22, 0.25, 0.3], [261.6, 0.44, 0.5, 0.3]]);
    },
    play(name) {
      if (!this.enabled || !this.ctx || !this.sfx[name]) return;
      const src = this.ctx.createBufferSource(); src.buffer = this.sfx[name]; src.connect(this.master); src.start();
    },

    // ---------- muzyka ----------
    levelFor(c) { return c >= 20 ? 3 : c >= 10 ? 2 : c >= 5 ? 1 : 0; },
    setMusic(combo) { this.pendingCombo = combo; this.setMusicLevel(this.levelFor(combo)); },
    setMusicLevel(level, force) {
      if (!this.ctx || !this.musicEnabled) return;
      if (level === this.curLevel && !force) return;
      this.curLevel = level;
      if (!this.music[level]) this.music[level] = this.renderMusic(level);
      const now = this.ctx.currentTime;
      if (this.cur) { const old = this.cur; old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0, now + 1.2); old.s.stop(now + 1.3); }
      const s = this.ctx.createBufferSource(); s.buffer = this.music[level]; s.loop = true;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.45, now + 1.2);
      s.connect(g); g.connect(this.master); s.start();
      this.cur = { s, g };
    },
    stopMusic() {
      if (this.cur && this.ctx) { const now = this.ctx.currentTime; this.cur.g.gain.setValueAtTime(this.cur.g.gain.value, now); this.cur.g.gain.linearRampToValueAtTime(0, now + 0.4); this.cur.s.stop(now + 0.5); }
      this.cur = null; this.curLevel = -1;
    },
    // pętla 4 taktów (C – Am – F – G); wyższy poziom = szybciej i więcej instrumentów
    renderMusic(level) {
      const sr = this.ctx.sampleRate, bpm = [92, 104, 118, 132][level], beat = 60 / bpm, n = Math.floor(beat * 16 * sr), m = new Float32Array(n);
      const tone = (f, st, d, v, env) => {
        const s0 = Math.floor(st * sr), len = Math.floor(d * sr);
        for (let i = 0; i < len; i++) {
          const t = i / sr;
          const e = env === 'pad' ? Math.min(1, t / 0.25) * Math.min(1, (d - t) / 0.4) : env === 'pluck' ? Math.min(1, t / 0.004) * Math.exp(-t * 7 / d) : Math.min(1, t / 0.004) * Math.exp(-t * 3 / d);
          let w = Math.sin(2 * Math.PI * f * t);
          if (env === 'bell') w += 0.4 * Math.sin(2 * Math.PI * f * 2.01 * t);
          if (env === 'pluck') w += 0.3 * Math.sin(4 * Math.PI * f * t);
          m[(s0 + i) % n] += w * e * v;
        }
      };
      let seed = 12345; const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) / (1 << 24) * 2 - 1; };
      const kick = st => { const s0 = Math.floor(st * sr), len = Math.floor(0.22 * sr); let ph = 0; for (let i = 0; i < len; i++) { const t = i / sr; ph += 2 * Math.PI * (45 + 90 * Math.exp(-t * 30)) / sr; m[(s0 + i) % n] += Math.sin(ph) * Math.exp(-t * 14) * 0.5; } };
      const hat = (st, v) => { const s0 = Math.floor(st * sr), len = Math.floor(0.035 * sr); for (let i = 0; i < len; i++) m[(s0 + i) % n] += noise() * Math.exp(-i / sr * 90) * v; };
      const snare = st => { const s0 = Math.floor(st * sr), len = Math.floor(0.14 * sr); for (let i = 0; i < len; i++) { const t = i / sr; m[(s0 + i) % n] += noise() * Math.exp(-t * 28) * 0.22 + Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30) * 0.15; } };
      const ch = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]], bs = [65.41, 55, 43.65, 49];
      const mel = [[523.25, 0, 659.25, 0, 783.99, 659.25, 0, 523.25], [440, 0, 523.25, 0, 659.25, 0, 523.25, 0], [349.23, 0, 440, 523.25, 0, 440, 0, 349.23], [392, 493.88, 0, 587.33, 0, 493.88, 392, 0]];
      for (let b = 0; b < 4; b++) {
        const t0 = b * 4 * beat, c = ch[b];
        c.forEach(f => tone(f, t0, 4 * beat, level === 0 ? 0.07 : 0.05, 'pad'));
        if (level === 0) { tone(bs[b] * 2, t0, 2 * beat, 0.22, 'pluck'); tone(bs[b] * 2, t0 + 2 * beat, 2 * beat, 0.18, 'pluck'); }
        else if (level < 3) { for (let k = 0; k < 4; k++) tone(bs[b] * 2, t0 + k * beat, beat, 0.22, 'pluck'); }
        else { for (let e = 0; e < 8; e++) tone(bs[b] * (e % 2 ? 4 : 2), t0 + e * beat / 2, beat / 2, 0.2, 'pluck'); }
        if (level >= 1) { const steps = level >= 2 ? 16 : 8, l = 4 * beat / steps; for (let k = 0; k < steps; k++) tone(c[k % 3] * 2, t0 + k * l, l * 1.6, level >= 2 ? 0.05 : 0.06, 'pluck'); }
        if (level <= 1) { const mm = mel[b]; tone(mm[0], t0, 1.6 * beat, 0.08, 'bell'); tone(mm[4] || mm[2], t0 + 2.5 * beat, 1.4 * beat, 0.06, 'bell'); }
        else mel[b].forEach((f, k) => { if (f > 0) tone(f, t0 + k * beat / 2, beat * 0.6, level >= 3 ? 0.08 : 0.06, 'bell'); });
        if (level >= 1) for (let k = 0; k < 4; k++) if (level >= 3 || k % 2 === 0) kick(t0 + k * beat);
        if (level >= 2) { snare(t0 + beat); snare(t0 + 3 * beat); for (let e = 0; e < 8; e++) hat(t0 + e * beat / 2, e % 2 ? 0.05 : 0.08); }
        if (level >= 3) for (let e = 1; e < 16; e += 2) hat(t0 + e * beat / 4, 0.04);
      }
      let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(m[i]));
      const g = pk > 0.9 ? 0.9 / pk : 1, buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = m[i] * g;
      return buf;
    },
  };
  root.Sound = Sound;
})(window);
