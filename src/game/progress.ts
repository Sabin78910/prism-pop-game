import type { Booster } from "./session";

export interface Progress {
  unlocked: number; // highest level that can be played
  stars: Record<number, number>; // best stars per level
  best: Record<number, number>; // best score per level
  coins: number;
  boosters: Record<Booster, number>;
  daily: { lastDone: string | null; streak: number; best: number };
  /** When coins or boosters last changed on this device (ms); decides which device wins on sync. */
  updatedAt: number;
}

export const BOOSTER_PRICE: Record<Booster, number> = { hammer: 30, shuffle: 20, moves: 40 };

export function newProgress(): Progress {
  return {
    unlocked: 1,
    stars: {},
    best: {},
    coins: 50,
    boosters: { hammer: 2, shuffle: 2, moves: 1 },
    daily: { lastDone: null, streak: 0, best: 0 },
    updatedAt: 0,
  };
}

/** Records a finished level; keeps best stars and score and unlocks the next one. */
export function recordWin(p: Progress, level: number, stars: number, score: number, coins: number, now = Date.now()): Progress {
  return {
    ...p,
    updatedAt: now,
    unlocked: Math.max(p.unlocked, level + 1),
    stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) },
    best: { ...p.best, [level]: Math.max(p.best[level] ?? 0, score) },
    coins: p.coins + coins,
  };
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Marks today's daily challenge done; the streak continues only from yesterday. */
export function recordDaily(p: Progress, today: string, coins: number, now = Date.now()): Progress {
  if (p.daily.lastDone === today) return p;
  const streak = p.daily.lastDone === dayBefore(today) ? p.daily.streak + 1 : 1;
  return {
    ...p,
    coins: p.coins + coins + Math.min(streak, 7) * 5,
    daily: { lastDone: today, streak, best: Math.max(p.daily.best, streak) },
    updatedAt: now,
  };
}

/** Streak still shown as alive if the last daily was today or yesterday. */
export function liveStreak(p: Progress, today: string): number {
  return p.daily.lastDone === today || p.daily.lastDone === dayBefore(today) ? p.daily.streak : 0;
}

export function buyBooster(p: Progress, b: Booster, now = Date.now()): Progress | null {
  if (p.coins < BOOSTER_PRICE[b]) return null;
  return { ...p, updatedAt: now, coins: p.coins - BOOSTER_PRICE[b], boosters: { ...p.boosters, [b]: p.boosters[b] + 1 } };
}

export function spendBooster(p: Progress, b: Booster, now = Date.now()): Progress | null {
  if (p.boosters[b] <= 0) return null;
  return { ...p, updatedAt: now, boosters: { ...p.boosters, [b]: p.boosters[b] - 1 } };
}

const STORAGE_KEY = "prism-pop-progress-v1";

export function loadProgress(storage: Pick<Storage, "getItem"> | undefined): Progress {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return newProgress();
    const data = JSON.parse(raw) as Partial<Progress>;
    const base = newProgress();
    return {
      ...base,
      ...data,
      boosters: { ...base.boosters, ...data.boosters },
      daily: { ...base.daily, ...data.daily },
    };
  } catch {
    return newProgress();
  }
}

export function saveProgress(storage: Pick<Storage, "setItem"> | undefined, p: Progress): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked: progress stays in memory for this session.
  }
}

function maxPerKey(a: Record<number, number>, b: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[Number(k)] = Math.max(out[Number(k)] ?? 0, v);
  return out;
}

/**
 * Combines progress from two devices without losing anything earned:
 * levels, stars and best scores take the maximum; coins and boosters come from the device
 * that changed them most recently; the daily streak comes from the most recent daily played.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const newer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0) ? remote : local;
  const ld = local.daily.lastDone ?? "";
  const rd = remote.daily.lastDone ?? "";
  const daily = rd > ld || (rd === ld && remote.daily.streak > local.daily.streak) ? remote.daily : local.daily;
  return {
    unlocked: Math.max(local.unlocked, remote.unlocked),
    stars: maxPerKey(local.stars, remote.stars),
    best: maxPerKey(local.best, remote.best),
    coins: newer.coins,
    boosters: { ...newer.boosters },
    daily: { ...daily, best: Math.max(local.daily.best, remote.daily.best, daily.best) },
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
}
