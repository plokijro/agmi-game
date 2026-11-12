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
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      hp.connect(lp); lp.connect(this.master);
      return (this.bus = hp);
    },
    stopMusic() {
      if (this.cur && this.ctx) { const now = this.ctx.currentTime; this.cur.g.gain.setValueAtTime(this.cur.g.gain.value, now); this.cur.g.gain.linearRampToValueAtTime(0, now + 0.4); this.cur.s.stop(now + 0.5); }
      this.cur = null; this.curLevel = -1;
    },
    // Ciepła, akustyczna pętla: gitara klasyczna (szarpana struna – algorytm Karplusa-Stronga)
    // i skrzypce (smyczek z vibrato). Progresja z Kanonu D-dur Pachelbela (XVII w.).
    // Średni rejestr (ok. 185–500 Hz), bez ostrych wysokich tonów i bez dudniącego basu.
    // Wyższe combo = żywsze tempo i gęstsze granie.
    renderMusic(level) {
      const sr = this.ctx.sampleRate, bpm = [84, 92, 100, 108][level], beat = 60 / bpm, bars = 8, n = Math.floor(beat * 4 * bars * sr), m = new Float32Array(n);
      const hz = k => 440 * Math.pow(2, (k - 69) / 12);
      let seed = 777; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed >>> 8) / (1 << 24) * 2 - 1; };
      // gitara: szum w krótkiej pętli opóźniającej, uśredniany przy każdym obiegu = naturalnie gasnąca struna
      const guitar = (k, st, v) => {
        const L = Math.max(2, Math.round(sr / hz(k))), dl = new Float32Array(L), s0 = Math.floor(st * sr), len = Math.floor(2.2 * sr);
        let prev = 0; for (let i = 0; i < L; i++) { const x = rnd(); prev = prev * 0.5 + x * 0.5; dl[i] = prev; }   // miękkie szarpnięcie (opuszkiem, nie kostką)
        let idx = 0, last = 0;
        for (let i = 0; i < len; i++) {
          const cur = dl[idx], nxt = dl[(idx + 1) % L], y = 0.4985 * (cur + nxt);
          dl[idx] = y; idx = (idx + 1) % L;
          last = last * 0.3 + cur * 0.7;                                        // przyciemnienie barwy
          m[(s0 + i) % n] += last * v * (i > len - 2000 ? (len - i) / 2000 : 1);
        }
      };
      // skrzypce: piłokształtna fala z łagodnie wygaszonymi alikwotami, wolne wejście smyczka i vibrato
      const violin = (k, st, d, v) => {
        const f = hz(k), s0 = Math.floor(st * sr), len = Math.floor((d + 0.25) * sr), H = 6;
        let ph = 0;
        for (let i = 0; i < len; i++) {
          const t = i / sr, vib = 1 + 0.004 * Math.min(1, t / 0.4) * Math.sin(2 * Math.PI * 5.2 * t);
          ph += 2 * Math.PI * f * vib / sr;
          let w = 0; for (let h = 1; h <= H; h++) w += Math.sin(ph * h) / (h * h);
          const env = Math.min(1, t / 0.18) * (t > d ? Math.max(0, 1 - (t - d) / 0.25) : 1);
          m[(s0 + i) % n] += w * env * v;
        }
      };
      // D – A – Hm – Fism – G – D – G – A, chwyty gitarowe (najniższa nuta = bas palcem kciukiem)
      const ch = [[57, 62, 66, 69], [57, 61, 64, 69], [59, 62, 66, 71], [54, 61, 66, 69], [55, 59, 62, 67], [57, 62, 66, 69], [55, 59, 62, 67], [57, 61, 64, 69]];
      const line = [66, 64, 62, 61, 59, 57, 59, 61];                       // Fis4 E4 D4 Cis4 H3 A3 H3 Cis4
      const mel = [[66, 69, 67, 66], [64, 57, 61, 64], [62, 66, 64, 62], [61, 54, 57, 61],
                   [59, 62, 61, 59], [57, 54, 57, 62], [59, 55, 59, 62], [61, 64, 67, 64]];
      for (let b = 0; b < bars; b++) {
        const t0 = b * 4 * beat, c = ch[b];
        const pick = level === 0 ? [0, 2, 3, 2] : [0, 2, 1, 3, 0, 2, 1, 3];
        const step = 4 * beat / pick.length;
        pick.forEach((s, i) => guitar(c[s], t0 + i * step + rnd() * 0.008, s === 0 ? 0.55 : 0.4));    // palcówka
        if (level < 2) violin(line[b], t0, 4 * beat - 0.1, level === 0 ? 0.07 : 0.08);                 // długie nuty skrzypiec
        else mel[b].forEach((k, i) => violin(k, t0 + i * beat, beat - 0.05, 0.09));                    // melodia ćwierćnutami
        if (level >= 3) violin(c[3], t0, 4 * beat - 0.1, 0.05);                                              // drugie skrzypce, podkład
      }
      let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(m[i]));
      const g = pk > 0 ? 0.45 / pk : 1, buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = m[i] * g;
      return buf;
    },
  };
  root.Sound = Sound;
})(window);
