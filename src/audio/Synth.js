import { STORE_MUTED } from '../const.js';

// All audio is synthesized — no files. A lookahead scheduler drives a
// kick/bass/arp loop whose tempo and filter open up with fall speed.
const SEMI = (n) => 55 * Math.pow(2, n / 12); // A1 root
const MINOR = [0, 3, 5, 7, 10, 12, 15, 19];
const BASS_PATTERN = [0, 0, -2, 5]; // per bar

export class Synth {
  constructor(scene = null) {
    this.ctx = null;
    this.muted = localStorage.getItem(STORE_MUTED) === '1';
    this.intensity = 0; // 0..1, driven by fall speed
    this.step = 0;
    this.bar = 0;
    this.scene = scene;
    this.audioTrack = null;
  }

  unlock() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.4;
    this.master.connect(this.ctx.destination);

    this.arpFilter = this.ctx.createBiquadFilter();
    this.arpFilter.type = 'lowpass';
    this.arpFilter.frequency.value = 600;
    this.arpFilter.connect(this.master);

    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), 40);
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(STORE_MUTED, this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.4;
    if (this.audioTrack) this.audioTrack.setMute(this.muted);
    return this.muted;
  }

  playTrack() {
    if (this.scene && this.scene.sound) {
      this.audioTrack = this.scene.sound.add('astral-float', {
        volume: this.muted ? 0 : 0.6,
        loop: true,
      });
      this.audioTrack.play();
    }
  }

  stopTrack() {
    if (this.audioTrack) {
      this.audioTrack.stop();
      this.audioTrack = null;
    }
  }

  setIntensity(v) {
    this.intensity = Math.min(Math.max(v, 0), 1);
    if (this.arpFilter && this.ctx) {
      this.arpFilter.frequency.setTargetAtTime(500 + this.intensity * 4500, this.ctx.currentTime, 0.2);
    }
  }

  _schedule() {
    if (!this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this._playStep(this.step, this.nextTime);
      const bpm = 96 + this.intensity * 72;
      this.nextTime += 60 / bpm / 4; // 16th notes
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
  }

  _playStep(s, t) {
    if (s % 4 === 0) {
      this._kick(t);
      this._bass(t, SEMI(BASS_PATTERN[this.bar] + (s === 8 ? 3 : 0)));
    }
    if (this.intensity > 0.12 && s % 2 === 0) {
      const scale = MINOR[(s / 2 + this.bar * 2) % MINOR.length];
      this._arp(t, SEMI(scale + 24));
    }
    if (this.intensity > 0.45 && s % 2 === 1) this._hat(t);
  }

  _env(t, peak, dur) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    return g;
  }

  _kick(t) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.1);
    const g = this._env(t, 0.9, 0.13);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  _bass(t, freq) {
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220 + this.intensity * 500;
    const g = this._env(t, 0.35, 0.22);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  _arp(t, freq) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = this._env(t, 0.06 + this.intensity * 0.08, 0.11);
    o.connect(g).connect(this.arpFilter);
    o.start(t);
    o.stop(t + 0.13);
  }

  _hat(t) {
    const g = this._env(t, 0.05, 0.04);
    this._noise(t, 0.05).connect(g).connect(this.master);
  }

  _noise(t, dur) {
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.start(t);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    src.connect(hp);
    return hp;
  }

  // ---------- SFX ----------
  death() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this._env(t, 0.7, 0.45);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(8000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.45);
    this._noise(t, 0.45).connect(lp).connect(g).connect(this.master);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    const og = this._env(t, 0.4, 0.5);
    o.connect(og).connect(this.master);
    o.start(t);
    o.stop(t + 0.55);
  }

  gem() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1318].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      const g = this._env(t + i * 0.07, 0.18, 0.09);
      o.connect(g).connect(this.master);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.1);
    });
  }

  zone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.65);
  }

  ui() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 660;
    const g = this._env(t, 0.12, 0.06);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.08);
  }
}
