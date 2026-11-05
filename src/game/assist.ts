import type { Level } from "./types";

/**
 * Fair assist, adapted to each player: every loss on a level gives the next try a few more moves, and after a
 * long run of losses the board also deals one colour fewer so matches come easier. It looks only at how the
 * player plays on this device, never at spending, and it only ever helps.
 * It only ever helps, it is shown on screen, the player can switch it off, and the daily challenge never
 * gets it (so everyone plays the same daily board). Losses are counted on this device only.
 */
export type AssistLog = Record<number, number>;

/** Extra starting moves after this many losses in a row on one level. */
export function assistMoves(losses: number): number {
  return Math.min(6, Math.max(0, losses) * 2);
}

/** After this many losses in a row on one level, the board deals one colour fewer. */
export const CALM_AFTER = 4;

export function withAssist(level: Level, log: AssistLog, enabled: boolean): { level: Level; extra: number; calm: boolean } {
  const losses = enabled && level.number > 0 ? (log[level.number] ?? 0) : 0;
  const extra = assistMoves(losses);
  // One colour fewer, but never below four and never the colour the goal asks for.
  const goalColor = level.objective.kind === "collect" ? level.objective.color : -1;
  const calm = losses >= CALM_AFTER && level.colors > 4 && goalColor < level.colors - 1;
  if (!extra && !calm) return { level, extra, calm };
  return { level: { ...level, moves: level.moves + extra, colors: calm ? level.colors - 1 : level.colors }, extra, calm };
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
