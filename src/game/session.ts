import { createGrid, findHint, shuffleGrid } from "./board";
import { playMove, smash, type ResolveContext } from "./resolve";
import { createRng } from "./rng";
import type { Grid, Level, Pos, Step } from "./types";

/** Live state of one level being played. Pure data; the UI renders it. */
export interface Session {
  level: Level;
  grid: Grid;
  ctx: ResolveContext;
  movesLeft: number;
  score: number;
  collected: number[]; // per colour
  jellyLeft: number;
  status: "playing" | "won" | "lost";
  bestCombo: number;
}

export function startSession(level: Level): Session {
  const rng = createRng(level.seed ^ 0x9e3779b9);
  const ctx: ResolveContext = { rng, colors: level.colors, jelly: level.jelly.map((r) => r.slice()), nextId: 1 };
  const grid = createGrid(level.rows, level.cols, level.colors, rng, ctx);
  return {
    level,
    grid,
    ctx,
    movesLeft: level.moves,
    score: 0,
    collected: Array(level.colors).fill(0),
    jellyLeft: countJelly(ctx.jelly),
    status: "playing",
    bestCombo: 0,
  };
}

export function countJelly(jelly: number[][]): number {
  return jelly.flat().filter((x) => x > 0).length;
}

/** 0..1 progress towards the level objective. */
export function objectiveProgress(s: Session): number {
  const o = s.level.objective;
  if (o.kind === "score") return Math.min(1, s.score / o.target);
  if (o.kind === "collect") return Math.min(1, s.collected[o.color] / o.count);
  return o.count === 0 ? 1 : Math.min(1, (o.count - s.jellyLeft) / o.count);
}

export function starsFor(level: Level, score: number): number {
  return level.stars.filter((t) => score >= t).length;
}

function applySteps(s: Session, steps: Step[]): void {
  for (const step of steps) {
    s.score += step.score;
    s.bestCombo = Math.max(s.bestCombo, step.combo);
    for (const { gem } of step.cleared) if (gem.color >= 0 && gem.color < s.collected.length) s.collected[gem.color]++;
  }
  s.jellyLeft = countJelly(s.ctx.jelly);
}

function checkEnd(s: Session): void {
  if (objectiveProgress(s) >= 1) s.status = "won";
  else if (s.movesLeft <= 0) s.status = "lost";
}

export interface TurnResult {
  valid: boolean;
  steps: Step[];
  shuffled: boolean;
}

/** Makes sure a move exists, shuffling if needed. */
function ensureMove(s: Session): boolean {
  if (findHint(s.grid)) return false;
  s.grid = shuffleGrid(s.grid, s.ctx.rng);
  return true;
}

/** Plays a swap. Mutates the session. */
export function swap(s: Session, a: Pos, b: Pos): TurnResult {
  if (s.status !== "playing") return { valid: false, steps: [], shuffled: false };
  const res = playMove(s.grid, a, b, s.ctx);
  if (!res.valid) return { valid: false, steps: [], shuffled: false };
  s.grid = res.grid;
  s.movesLeft--;
  applySteps(s, res.steps);
  checkEnd(s);
  return { valid: true, steps: res.steps, shuffled: s.status === "playing" && ensureMove(s) };
}

export type Booster = "hammer" | "shuffle" | "moves";

/** Uses a booster. Boosters never cost a move. */
export function useBooster(s: Session, booster: Booster, at?: Pos): TurnResult {
  if (s.status !== "playing" && !(booster === "moves" && s.status === "lost")) {
    return { valid: false, steps: [], shuffled: false };
  }
  if (booster === "moves") {
    s.movesLeft += 5;
    s.status = "playing";
    return { valid: true, steps: [], shuffled: false };
  }
  if (booster === "shuffle") {
    s.grid = shuffleGrid(s.grid, s.ctx.rng);
    return { valid: true, steps: [], shuffled: true };
  }
  if (!at) return { valid: false, steps: [], shuffled: false };
  const res = smash(s.grid, at, s.ctx);
  if (!res.valid) return { valid: false, steps: [], shuffled: false };
  s.grid = res.grid;
  applySteps(s, res.steps);
  checkEnd(s);
  return { valid: true, steps: res.steps, shuffled: s.status === "playing" && ensureMove(s) };
}

/** Coins earned for finishing a level: 10 per star plus 2 per unused move. */
export function coinReward(stars: number, movesLeft: number): number {
  return stars * 10 + movesLeft * 2;
}
