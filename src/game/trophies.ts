import type { Progress } from "./progress";

export const TROPHY_IDS = ["firstWin", "perfect", "tenLevels", "fiftyStars", "firstDaily", "streak3", "streak7", "rich"] as const;
export type TrophyId = (typeof TROPHY_IDS)[number];

/** Which trophies are earned. Derived from progress, so nothing extra is stored or synced. */
export function earnedTrophies(p: Progress): Record<TrophyId, boolean> {
  const stars = Object.values(p.stars);
  const total = stars.reduce((a, b) => a + b, 0);
  return {
    firstWin: stars.length >= 1,
    perfect: stars.some((s) => s >= 3),
    tenLevels: stars.length >= 10,
    fiftyStars: total >= 50,
    firstDaily: p.daily.lastDone !== null,
    streak3: p.daily.best >= 3,
    streak7: p.daily.best >= 7,
    rich: p.coins >= 500,
  };
}
