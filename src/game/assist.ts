import type { Level } from "./types";

/**
 * Fair assist: after repeated losses on the same level, the next try starts with a few extra moves.
 * It only ever helps, it is shown on screen, the player can switch it off, and the daily challenge never
 * gets it (so everyone plays the same daily board). Losses are counted on this device only.
 */
export type AssistLog = Record<number, number>;

/** Extra starting moves after this many losses in a row on one level. */
export function assistMoves(losses: number): number {
  if (losses >= 4) return 5;
  if (losses >= 2) return 3;
  return 0;
}

export function withAssist(level: Level, log: AssistLog, enabled: boolean): { level: Level; extra: number } {
  const extra = enabled && level.number > 0 ? assistMoves(log[level.number] ?? 0) : 0;
  return { level: extra ? { ...level, moves: level.moves + extra } : level, extra };
}

/** A loss adds to the level's count; a win clears it. The daily challenge is never counted. */
export function recordResult(log: AssistLog, level: number, won: boolean): AssistLog {
  if (level <= 0) return log;
  const next = { ...log };
  if (won) delete next[level];
  else next[level] = (next[level] ?? 0) + 1;
  return next;
}

const KEY = "prism-pop-assist-v1";

export function loadAssist(storage: Pick<Storage, "getItem"> | undefined): AssistLog {
  try {
    const o = JSON.parse(storage?.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const out: AssistLog = {};
    for (const [k, v] of Object.entries(o)) if (Number(k) > 0 && typeof v === "number" && v > 0) out[Number(k)] = Math.floor(v);
    return out;
  } catch {
    return {};
  }
}

export function saveAssist(storage: Pick<Storage, "setItem"> | undefined, log: AssistLog): void {
  try {
    storage?.setItem(KEY, JSON.stringify(log));
  } catch {
    // Storage blocked: assist resets next session, which is harmless.
  }
}
