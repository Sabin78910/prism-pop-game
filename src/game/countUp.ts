/**
 * Timing for numbers that count up and coins that fly to the wallet (docs/DESIGN-SYSTEM.md, Motion).
 * Pure, so the curves are unit tested; the components only feed in elapsed time.
 */

/** Count-up length in ms: longer for bigger jumps, but never dull (300ms) or slow (1200ms). */
export function countUpDuration(delta: number): number {
  return Math.round(Math.min(1200, 300 + 40 * Math.sqrt(Math.abs(delta))));
}

/** Value shown `elapsed` ms into a count from `from` to `to`, ease-out cubic, exact at the end. */
export function countUpAt(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to;
  if (elapsed <= 0) return from;
  const p = elapsed / duration;
  const eased = 1 - Math.pow(1 - p, 3);
  return Math.round(from + (to - from) * eased);
}

/** How many coin sprites fly for a reward: a few for small amounts, capped at 10, none for nothing. */
export function coinFlightCount(coins: number): number {
  if (coins <= 0) return 0;
  return Math.min(10, Math.max(3, Math.ceil(coins / 5)));
}

/** Delay before each flying coin starts, so they leave in a quick stream. */
export const COIN_STAGGER_MS = 60;
/** Flight time of one coin. */
export const COIN_FLIGHT_MS = 620;

/** When the wallet should start counting: as the first coin lands. */
export function walletDelay(count: number): number {
  return count > 0 ? COIN_FLIGHT_MS : 0;
}
