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
        this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
        this.buildSfx();
        if (this.musicEnabled) this.setMusicLevel(this.levelFor(this.pendingCombo), true);
        // pozostałe poziomy muzyki liczymy po cichu w tle, żeby gra nie przycinała przy zmianie combo
        [0, 1, 2, 3].forEach((l, k) => setTimeout(() => { if (!this.music[l]) this.music[l] = this.renderMusic(l); }, 1500 + k * 700));
      }
      if (this.ctx.state !== 'running') this.ctx.resume();
      // krótka cisza odtworzona w geście użytkownika „odblokowuje” dźwięk na iPhonie
      if (!this.unlocked) {
        const b = this.ctx.createBuffer(1, 1, this.ctx.sampleRate), src = this.ctx.createBufferSource();
        src.buffer = b; src.connect(this.ctx.destination); src.start(0); this.unlocked = true;
      }
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
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.3, now + 1.2);
      s.connect(g); g.connect(this.musicBus()); s.start();
      this.cur = { s, g };
    },
    // filtry: obcinają najniższe tony (brzęczenie głośnika) i ostre wysokie
    musicBus() {
      if (this.bus) return this.bus;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
      hp.connect(lp); lp.connect(this.master);
      return (this.bus = hp);
    },
    stopMusic() {
      if (this.cur && this.ctx) { const now = this.ctx.currentTime; this.cur.g.gain.setValueAtTime(this.cur.g.gain.value, now); this.cur.g.gain.linearRampToValueAtTime(0, now + 0.4); this.cur.s.stop(now + 0.5); }
      this.cur = null; this.curLevel = -1;
    },
    // Klasyczna pętla w stylu barokowym (progresja Kanonu D-dur Pachelbela, utwór z XVII w.):
    // brzmienie miękkiego fortepianu/harfy, akompaniament „basem Albertiego” w średnim rejestrze
    // (nic poniżej ~277 Hz, więc głośnik telefonu nie brzęczy). Wyższe combo = żywsze tempo i więcej głosów.
    renderMusic(level) {
      const sr = this.ctx.sampleRate, bpm = [92, 100, 108, 116][level], beat = 60 / bpm, bars = 8, n = Math.floor(beat * 4 * bars * sr), m = new Float32Array(n);
      const hz = k => 440 * Math.pow(2, (k - 69) / 12);
      // miękki „fortepian”: ton podstawowy + delikatne alikwoty, które gasną szybciej
      const note = (k, st, v, decay) => {
        const f = hz(k), s0 = Math.floor(st * sr), len = Math.floor(Math.min(2.2, 4.5 / decay) * sr), atk = 0.005 * sr;
        // szybka synteza: obrót wskazów zamiast sin/exp w każdej próbce
        const P = [[1, 1], [2, 0.22], [3, 0.06]].map(([h, amp]) => {
          const w = 2 * Math.PI * f * h / sr; return { c: Math.cos(w), s: Math.sin(w), x: 1, y: 0, e: amp * v, k: Math.exp(-decay * h / sr) };
        });
        for (let i = 0; i < len; i++) {
          let o = 0;
          for (const q of P) { const nx = q.x * q.c - q.y * q.s; q.y = q.x * q.s + q.y * q.c; q.x = nx; o += q.y * q.e; q.e *= q.k; }
          m[(s0 + i) % n] += o * (i < atk ? i / atk : 1);
        }
      };
      // D – A – Hm – Fism – G – D – G – A (trójdźwięki ułożone od dołu w 4. oktawie)
      const ch = [[62, 66, 69], [61, 64, 69], [62, 66, 71], [61, 66, 69], [62, 67, 71], [62, 66, 69], [62, 67, 71], [61, 64, 69]];
      const line = [78, 76, 74, 73, 71, 69, 71, 73];                       // Fis5 E5 D5 Cis5 H4 A4 H4 Cis5
      const mel = [[78, 81, 79, 78], [76, 69, 73, 76], [74, 78, 76, 74], [73, 66, 69, 73],
                   [71, 74, 73, 71], [69, 66, 69, 74], [71, 67, 71, 74], [73, 76, 79, 76]];
      for (let b = 0; b < bars; b++) {
        const t0 = b * 4 * beat, [lo, mid, hi] = ch[b];
        if (level === 0) [lo, mid, hi, mid].forEach((k, i) => note(k, t0 + i * beat, 0.035, 2.2));          // spokojnie rozłożony akord
        else [lo, hi, mid, hi, lo, hi, mid, hi].forEach((k, i) => note(k, t0 + i * beat / 2, i % 2 ? 0.024 : 0.032, 3)); // bas Albertiego
        if (level < 2) note(line[b], t0, 0.065, 0.9);                        // długie, śpiewne nuty melodii
        else mel[b].forEach((k, i) => note(k, t0 + i * beat, 0.055, 1.8));   // melodia ćwierćnutami
        if (level >= 3) note(line[b] + 12, t0 + 2 * beat, 0.025, 1.2);       // drugi głos w wysokim rejestrze
      }
      let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(m[i]));
      const g = pk > 0 ? 0.45 / pk : 1, buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = m[i] * g;
      return buf;
    },
  };
  root.Sound = Sound;
})(window);
