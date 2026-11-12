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
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.22, now + 1.2);
      s.connect(g); g.connect(this.musicBus()); s.start();
      this.cur = { s, g };
    },
    // filtry: obcinają najniższe tony (brzęczenie głośnika) i ostre wysokie
    musicBus() {
      if (this.bus) return this.bus;
      const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
      hp.connect(lp); lp.connect(this.master);
      return (this.bus = hp);
    },
    stopMusic() {
      if (this.cur && this.ctx) { const now = this.ctx.currentTime; this.cur.g.gain.setValueAtTime(this.cur.g.gain.value, now); this.cur.g.gain.linearRampToValueAtTime(0, now + 0.4); this.cur.s.stop(now + 0.5); }
      this.cur = null; this.curLevel = -1;
    },
    // Bardzo łagodna pozytywka: tylko wysokie, miękkie dzwoneczki i cichutki podkład.
    // Żadnego basu ani perkusji – wszystko powyżej ~260 Hz, więc mały głośnik telefonu nie brzęczy.
    // Wyższy poziom combo = odrobinę szybciej i trochę więcej nut, ale wciąż spokojnie.
    renderMusic(level) {
      const sr = this.ctx.sampleRate, bpm = [72, 78, 84, 90][level], beat = 60 / bpm, n = Math.floor(beat * 16 * sr), m = new Float32Array(n);
      const tone = (f, st, d, v, pad) => {
        const s0 = Math.floor(st * sr), len = Math.floor(d * sr);
        for (let i = 0; i < len; i++) {
          const t = i / sr;
          const e = pad ? Math.min(1, t / 1.0) * Math.min(1, (d - t) / 1.2)          // podkład: bardzo wolne narastanie i wygasanie
                        : Math.min(1, t / 0.015) * Math.exp(-t * 3 / d);            // dzwoneczek: miękki atak, długie wybrzmienie
          m[(s0 + i) % n] += Math.sin(2 * Math.PI * f * t) * e * v;                // czysty sinus, bez ostrych harmonicznych
        }
      };
      // akordy C – Am – F – G zagrane oktawę wyżej niż wcześniej
      const ch = [[523.25, 659.25, 783.99], [440, 523.25, 659.25], [349.23, 440, 523.25], [392, 493.88, 587.33]];
      const mel = [[783.99, 659.25, 523.25, 659.25], [659.25, 523.25, 440, 523.25], [523.25, 440, 349.23, 440], [587.33, 493.88, 392, 493.88]];
      for (let b = 0; b < 4; b++) {
        const t0 = b * 4 * beat, c = ch[b];
        c.forEach(f => tone(f / 2, t0, 4 * beat + 0.6, 0.018, true));             // cichy podkład (262–392 Hz)
        // melodia: spokojne pojedyncze dzwonki
        const steps = level >= 2 ? 4 : 2;
        for (let k = 0; k < steps; k++) tone(mel[b][k * 4 / steps], t0 + k * 4 * beat / steps, 4 * beat / steps + 0.8, 0.05, false);
        // delikatne arpeggio od poziomu 1, gęstsze od poziomu 3
        if (level >= 1) {
          const arp = level >= 3 ? 8 : 4;
          for (let k = 0; k < arp; k++) tone(c[k % 3] * 2, t0 + (k + 0.5) * 4 * beat / arp, beat * 1.5, 0.018, false);
        }
      }
      let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(m[i]));
      const g = pk > 0 ? 0.35 / pk : 1, buf = this.ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = m[i] * g;
      return buf;
    },
  };
  root.Sound = Sound;
})(window);
