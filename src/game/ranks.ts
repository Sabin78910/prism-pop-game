/**
 * Level ranks, Bronze to King. Rank points come only from progress on the level map: 20 for a first clear and
 * 40 for each star, so replaying an easy level never pays twice. Points are worked out from the stars already
 * saved in Progress, so ranks sync across devices for free and mergeProgress can never lose one.
 *
 * Bronze to Crown have five divisions each (V up to I); Master, Champion, Legend and King stand alone.
 */
export const TIERS = ["bronze", "silver", "gold", "diamond", "crown", "master", "champion", "legend", "king"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_COLORS: Record<Tier, string> = {
  bronze: "#D98B4F",
  silver: "#C7D2E8",
  gold: "#FFD54A",
  diamond: "#6FC8FF",
  crown: "#FF9BD2",
  master: "#C77DFF",
  champion: "#5FE0D0",
  legend: "#FF6B8B",
  king: "#FFE27A",
};

/** Points where each tier begins. King needs about 100 levels at three stars. */
const TIER_STARTS = [0, 600, 1500, 2800, 4500, 6500, 8500, 11000, 14000];
const DIVISIONS = ["V", "IV", "III", "II", "I"];
const PER_TIER = 5;
const DIVIDED = 5; // bronze..crown
const DIVIDED_STEPS = DIVIDED * PER_TIER;
export const TOP_STEP = DIVIDED_STEPS + (TIERS.length - DIVIDED - 1);

export const FIRST_CLEAR = 20;
export const PER_STAR = 40;

/** Points a win adds: only stars beyond the best so far, plus the first clear. */
export function levelGain(starsBefore: number, starsNow: number): number {
  const before = Math.max(0, Math.min(3, starsBefore));
  const now = Math.max(0, Math.min(3, starsNow));
  return Math.max(0, now - before) * PER_STAR + (before === 0 && now > 0 ? FIRST_CLEAR : 0);
}

/** Total rank points from the best stars per level. The daily board (level 0) does not count. */
export function rankPoints(stars: Record<number, number>): number {
  let total = 0;
  for (const [k, v] of Object.entries(stars)) if (Number(k) > 0) total += levelGain(0, v);
  return total;
}

export function pointsFor(step: number): number {
  if (step <= 0) return 0;
  const s = Math.min(step, TOP_STEP);
  if (s >= DIVIDED_STEPS) return TIER_STARTS[DIVIDED + (s - DIVIDED_STEPS)];
  const r = Math.floor(s / PER_TIER);
  const i = s % PER_TIER;
  return TIER_STARTS[r] + Math.floor(((TIER_STARTS[r + 1] - TIER_STARTS[r]) * i) / PER_TIER);
}

export function stepOf(points: number): number {
  let step = 0;
  while (step < TOP_STEP && points >= pointsFor(step + 1)) step++;
  return step;
}

export function tierOf(step: number): Tier {
  const s = Math.max(0, Math.min(step, TOP_STEP));
  return TIERS[s < DIVIDED_STEPS ? Math.floor(s / PER_TIER) : DIVIDED + (s - DIVIDED_STEPS)];
}

/** Roman division for Bronze to Crown ("II"), empty for the single-step tiers. */
export function divisionOf(step: number): string {
  return step < DIVIDED_STEPS ? DIVISIONS[Math.max(0, step) % PER_TIER] : "";
}

export interface Rank {
  points: number;
  step: number;
  tier: Tier;
  division: string;
  /** 0..1 towards the next step; 1 at King. */
  fill: number;
  /** Points still needed for the next step; 0 at King. */
  toNext: number;
}

export function rankFor(points: number): Rank {
  const step = stepOf(points);
  const top = step >= TOP_STEP;
  const a = pointsFor(step);
  const b = pointsFor(step + 1);
  return {
    points,
    step,
    tier: tierOf(step),
    division: divisionOf(step),
    fill: top ? 1 : Math.min(1, Math.max(0, (points - a) / (b - a))),
    toNext: top ? 0 : b - points,
  };
}
