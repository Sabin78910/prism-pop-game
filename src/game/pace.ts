/**
 * Adaptive hint timing, learned on this device from the player's own pace.
 * Each move's think time feeds a running average. A quick player gets the hint glow later, so it never
 * nags them; a player who takes their time still gets help, never later than 10 seconds.
 * Only how long a move took is used: never purchases, ads or time spent in the app.
 */
export const DEFAULT_THINK = 3000;
const MIN_DELAY = 4000;
const MAX_DELAY = 10000;
const WEIGHT = 0.2;
const KEY = "prism-pop.pace";

/** Exponential moving average of think time in ms. Outliers (a phone put down) are capped. */
export function learnPace(avg: number, thinkMs: number): number {
  if (!Number.isFinite(thinkMs) || thinkMs < 150) return avg;
  const t = Math.min(thinkMs, 15000);
  return Math.round(avg + WEIGHT * (t - avg));
}

/** How long to wait before glowing a hint: about twice the player's usual think time. */
export function hintDelay(avg: number): number {
  return Math.round(Math.min(MAX_DELAY, Math.max(MIN_DELAY, avg * 2)));
}

export function loadPace(storage: Pick<Storage, "getItem"> | undefined): number {
  try {
    const n = Number(storage?.getItem(KEY));
    return n >= 150 && n <= 15000 ? n : DEFAULT_THINK;
  } catch {
    return DEFAULT_THINK;
  }
}

export function savePace(storage: Pick<Storage, "setItem"> | undefined, avg: number): void {
  try {
    storage?.setItem(KEY, String(avg));
  } catch {
    /* blocked storage: pace is relearned next session */
  }
}
