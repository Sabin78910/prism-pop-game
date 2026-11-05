/**
 * Decides whether the board canvas needs a new frame. Repainting an unchanged board 60 times a second kept
 * the main thread 100% busy on low-end phones, so a still board is not redrawn at all and a board whose only
 * motion is a gentle pulse (hint glow, special gems) is redrawn at a lower rate.
 */
export const PULSE_FRAME_MS = 40;

export type FrameState = {
  /** Something is moving: a swap, falling or settling gems, effects, particles, floating text or shake. */
  animating: boolean;
  /** Only slow idle pulses are on screen: the hint glow or a special gem breathing. */
  pulsing: boolean;
  /** Board, selection, size or props changed since the last drawn frame. */
  changed: boolean;
  /** Milliseconds since the last drawn frame. */
  sinceDraw: number;
};

export function shouldDraw(f: FrameState): boolean {
  if (f.animating || f.changed) return true;
  if (f.pulsing) return f.sinceDraw >= PULSE_FRAME_MS;
  return false;
}

/**
 * Backing-store scale for the canvas. A 3x phone screen fills 9x the pixels of a 1x one for no visible gain on
 * a 48px gem, so the scale is capped at 2, and at 1.5 on phones with four cores or fewer.
 */
export function canvasScale(dpr: number, cores: number | undefined): number {
  const cap = cores !== undefined && cores <= 4 ? 1.5 : 2;
  return Math.max(1, Math.min(dpr || 1, cap));
}
