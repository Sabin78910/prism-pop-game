/** Three daily missions. Kept on this device only (not synced); the coin reward goes into progress. */
export const MISSION_IDS = ["win3", "combo3", "daily"] as const;
export type MissionId = (typeof MISSION_IDS)[number];

export const MISSION_GOAL: Record<MissionId, number> = { win3: 3, combo3: 1, daily: 1 };
export const MISSION_REWARD: Record<MissionId, number> = { win3: 20, combo3: 25, daily: 30 };

export interface Missions {
  day: string;
  wins: number;
  /** Levels finished with a cascade of ×3 or more. */
  bigCombos: number;
  daily: number;
  claimed: Record<MissionId, boolean>;
}

export function freshMissions(day: string): Missions {
  return { day, wins: 0, bigCombos: 0, daily: 0, claimed: { win3: false, combo3: false, daily: false } };
}

/** `bestCombo` is the session's bestCombo; the player sees it as ×(bestCombo + 1). */
export function recordFinish(m: Missions, day: string, f: { won: boolean; daily: boolean; bestCombo: number }): Missions {
  const base = m.day === day ? m : freshMissions(day);
  if (!f.won) return base;
  return {
    ...base,
    wins: base.wins + 1,
    bigCombos: base.bigCombos + (f.bestCombo >= 2 ? 1 : 0),
    daily: base.daily + (f.daily ? 1 : 0),
  };
}

export function missionProgress(m: Missions, id: MissionId): number {
  const n = id === "win3" ? m.wins : id === "combo3" ? m.bigCombos : m.daily;
  return Math.min(n, MISSION_GOAL[id]);
}

export const missionDone = (m: Missions, id: MissionId): boolean => missionProgress(m, id) >= MISSION_GOAL[id];

/** Marks a finished mission as claimed and returns the coins to add; 0 when it can't be claimed. */
export function claimMission(m: Missions, id: MissionId): { missions: Missions; coins: number } {
  if (!missionDone(m, id) || m.claimed[id]) return { missions: m, coins: 0 };
  return { missions: { ...m, claimed: { ...m.claimed, [id]: true } }, coins: MISSION_REWARD[id] };
}

const KEY = "prism-pop-missions-v1";

export function loadMissions(storage: Pick<Storage, "getItem"> | undefined, day: string): Missions {
  try {
    const o = JSON.parse(storage?.getItem(KEY) ?? "null") as Partial<Missions> | null;
    if (!o || o.day !== day) return freshMissions(day);
    const n = (v: unknown) => (typeof v === "number" && v >= 0 ? Math.floor(v) : 0);
    const c = o.claimed ?? ({} as Partial<Missions["claimed"]>);
    return { day, wins: n(o.wins), bigCombos: n(o.bigCombos), daily: n(o.daily), claimed: { win3: c.win3 === true, combo3: c.combo3 === true, daily: c.daily === true } };
  } catch {
    return freshMissions(day);
  }
}

export function saveMissions(storage: Pick<Storage, "setItem"> | undefined, m: Missions): void {
  try {
    storage?.setItem(KEY, JSON.stringify(m));
  } catch {
    // Storage full or blocked: missions stay in memory for this session.
  }
}
