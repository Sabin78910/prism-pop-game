/**
 * Win streak: levels won in a row. A streak of two or more pays a bonus that grows with the streak, so the
 * reward size varies while the reward itself is always certain. A loss ends the streak; nothing is taken away.
 * Kept on this device only.
 */
export function nextStreak(streak: number, won: boolean): number {
  return won ? Math.max(0, streak) + 1 : 0;
}

/** Bonus coins for the streak just reached: 0 for a single win, then 5, 10, 15 ... capped at 50. */
export function streakBonus(streak: number): number {
  return streak < 2 ? 0 : Math.min(50, (streak - 1) * 5);
}

const KEY = "prism-pop-streak-v1";

export function loadStreak(storage: Pick<Storage, "getItem"> | undefined): number {
  try {
    const n = Number(storage?.getItem(KEY) ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveStreak(storage: Pick<Storage, "setItem"> | undefined, streak: number): void {
  try {
    storage?.setItem(KEY, String(streak));
  } catch {
    // Storage blocked: the streak lasts for this session only.
  }
}
