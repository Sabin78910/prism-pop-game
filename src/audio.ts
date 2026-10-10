import { popFrequency } from "./game/feedback";

/** Tiny synthesiser: every sound is generated in code, so there are no audio files to load. */
class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number): void {
    const ac = this.ac();
    if (!ac) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  pop(combo: number): void {
    const f = popFrequency(combo);
    this.tone(f, 0.14, "sine", 0.18);
    this.tone(f * 1.5, 0.1, "triangle", 0.08, 0.03);
  }
  swap(): void {
    this.tone(320, 0.08, "triangle", 0.06, 0, 520);
  }
  invalid(): void {
    this.tone(180, 0.12, "square", 0.04, 0, 120);
  }
  blast(): void {
    this.tone(120, 0.35, "sawtooth", 0.12, 0, 40);
    this.tone(880, 0.25, "sine", 0.08, 0.02, 1760);
  }
  special(): void {
    [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, "sine", 0.1, i * 0.05));
  }
  win(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, "triangle", 0.12, i * 0.09));
  }
  lose(): void {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, "sine", 0.1, i * 0.14));
  }
  coin(): void {
    this.tone(988, 0.08, "square", 0.05);
    this.tone(1319, 0.16, "square", 0.05, 0.07);
  }
}

export const sfx = new Sfx();
