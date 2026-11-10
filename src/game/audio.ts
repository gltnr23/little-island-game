/**
 * Procedural sound with the Web Audio API: waves, footsteps, effects and a gentle
 * generative melody. No audio files are needed. Mobile browsers only allow audio after
 * a user gesture, so `unlock()` must be called from a touch/key handler.
 */
const PENTATONIC = [0, 2, 4, 7, 9]; // major pentatonic, semitones

class SoundFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private lastStep = 0;

  get isEnabled(): boolean {
    return this.enabled;
  }

  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.5;
      this.music.connect(this.master);
      this.noise = this.makeNoise(2);
      this.startWaves();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.08);
    }
  }

  /** Short soft noise tick; grass sounds duller than sand. */
  step(onGrass: boolean): void {
    const ctx = this.ready();
    if (!ctx || ctx.currentTime - this.lastStep < 0.12) return;
    this.lastStep = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = onGrass ? 700 : 1500;
    filter.Q.value = 1.2;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t, Math.random(), 0.1);
  }

  pickup(): void {
    this.notes([76, 83], 0.07, 'sine', 0.16);
  }

  gather(): void {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(196, ctx.currentTime, 0.12, 'triangle', 0.18, 98);
    this.notes([72], 0.0, 'sine', 0.1, 0.06);
  }

  denied(): void {
    this.notes([62, 58], 0.1, 'triangle', 0.1);
  }

  restore(): void {
    this.notes([60, 64, 67, 72, 76], 0.09, 'triangle', 0.16);
  }

  click(): void {
    this.notes([84], 0, 'sine', 0.08);
  }

  /** One step of the background melody; called on a timer. Sparser and lower at night. */
  melodyStep(night: boolean): void {
    const ctx = this.ready();
    if (!ctx || !this.music) return;
    if (Math.random() < (night ? 0.55 : 0.35)) return;
    const base = night ? 57 : 64; // A3 / E4
    const degree = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    const octave = Math.random() < 0.25 ? 12 : 0;
    const midi = base + degree + octave;
    this.tone(midiToHz(midi), ctx.currentTime, 1.6, 'sine', 0.05, undefined, this.music);
    if (Math.random() < 0.3) this.tone(midiToHz(midi - 12), ctx.currentTime, 2.2, 'triangle', 0.03, undefined, this.music);
  }

  // ---------- internals ----------

  private ready(): AudioContext | null {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return null;
    return this.ctx;
  }

  private notes(midis: number[], gap: number, type: OscillatorType, vol: number, dur = 0.25): void {
    const ctx = this.ready();
    if (!ctx) return;
    midis.forEach((m, i) => this.tone(midiToHz(m), ctx.currentTime + i * gap, dur, type, vol));
  }

  private tone(
    hz: number,
    at: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    dest?: AudioNode,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g).connect(dest ?? this.master!);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** Looping filtered noise whose volume swells slowly, like waves on the shore. */
  private startWaves(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = ctx.createGain();
    depth.gain.value = 0.035;
    lfo.connect(depth).connect(g.gain);
    src.connect(filter).connect(g).connect(this.master!);
    src.start();
    lfo.start();
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export const sfx = new SoundFx();
