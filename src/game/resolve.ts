import { cloneGrid, findMatches, inBounds, isValidSwap, key, makeGem, specialFor, swapIn, type IdSource } from "./board";
import { randInt, type Rng } from "./rng";
import type { Gem, Grid, Pos, Special, Step } from "./types";

export interface ResolveContext extends IdSource {
  rng: Rng;
  colors: number;
  /** Jelly layers; decremented in place as gems above them clear. */
  jelly: number[][];
}

export const POINTS_PER_GEM = 60;
export const SPECIAL_BONUS = 200;
const MAX_CASCADES = 60;

function allCells(grid: Grid): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) out.push({ r, c });
  return out;
}

function cellsOfColor(grid: Grid, color: number): Pos[] {
  return allCells(grid).filter((p) => grid[p.r][p.c]?.color === color);
}

/** Most common colour on the board, used when a prism is set off by another blast. */
function commonestColor(grid: Grid): number {
  const counts = new Map<number, number>();
  for (const g of grid.flat()) if (g && g.color >= 0) counts.set(g.color, (counts.get(g.color) ?? 0) + 1);
  let best = 0;
  let n = -1;
  for (const [color, count] of counts) if (count > n) [best, n] = [color, count];
  return best;
}

/** Cells hit when a special at p goes off. */
export function blastArea(grid: Grid, p: Pos, special: Special): Pos[] {
  const rows = grid.length;
  const cols = grid[0].length;
  switch (special) {
    case "lineH":
      return Array.from({ length: cols }, (_, c) => ({ r: p.r, c }));
    case "lineV":
      return Array.from({ length: rows }, (_, r) => ({ r, c: p.c }));
    case "bomb": {
      const out: Pos[] = [];
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) out.push({ r: p.r + dr, c: p.c + dc });
      return out.filter((q) => inBounds(grid, q));
    }
    case "prism":
      return cellsOfColor(grid, commonestColor(grid));
    default:
      return [];
  }
}

interface ClearResult {
  cleared: { pos: Pos; gem: Gem }[];
  blasts: { pos: Pos; special: Special }[];
}

/** Clears the given cells from grid (in place), setting off any specials hit, in a chain. */
function clearChain(grid: Grid, start: Pos[], ctx: ResolveContext, noTrigger: Set<string>): ClearResult {
  const queue = [...start];
  const done = new Set<string>();
  const cleared: ClearResult["cleared"] = [];
  const blasts: ClearResult["blasts"] = [];
  while (queue.length) {
    const p = queue.shift()!;
    const k = key(p);
    if (done.has(k) || !inBounds(grid, p)) continue;
    done.add(k);
    const gem = grid[p.r][p.c];
    if (!gem) continue;
    cleared.push({ pos: p, gem });
    if (ctx.jelly[p.r]?.[p.c] > 0) ctx.jelly[p.r][p.c]--;
    if (gem.special !== "none" && !noTrigger.has(k)) {
      blasts.push({ pos: p, special: gem.special });
      queue.push(...blastArea(grid, p, gem.special));
    }
  }
  for (const { pos } of cleared) grid[pos.r][pos.c] = null;
  return { cleared, blasts };
}

/** Drops gems down and refills from the top. Mutates grid; returns the new gems. */
export function applyGravity(grid: Grid, ctx: ResolveContext): Step["spawned"] {
  const spawned: Step["spawned"] = [];
  const rows = grid.length;
  for (let c = 0; c < grid[0].length; c++) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const g = grid[r][c];
      if (g) {
        grid[r][c] = null;
        grid[write][c] = g;
        write--;
      }
    }
    const missing = write + 1;
    for (let r = write; r >= 0; r--) {
      const gem = makeGem(ctx, randInt(ctx.rng, ctx.colors));
      grid[r][c] = gem;
      spawned.push({ id: gem.id, c, startRow: r - missing });
    }
  }
  return spawned;
}

function finishStep(
  grid: Grid,
  res: ClearResult,
  created: Step["created"],
  combo: number,
  ctx: ResolveContext,
): Step {
  for (const { pos, gem } of created) grid[pos.r][pos.c] = gem;
  const afterClear = cloneGrid(grid);
  const spawned = applyGravity(grid, ctx);
  const score = (res.cleared.length * POINTS_PER_GEM + created.length * SPECIAL_BONUS) * (combo + 1);
  return {
    cleared: res.cleared,
    created,
    afterClear,
    afterFall: cloneGrid(grid),
    spawned,
    score,
    combo,
    blasts: res.blasts,
  };
}

/** Builds the step for swapping two specials (or a prism with anything). */
function comboStep(grid: Grid, a: Pos, b: Pos, ctx: ResolveContext): Step {
  const ga = grid[a.r][a.c]!;
  const gb = grid[b.r][b.c]!;
  const both = new Set([key(a), key(b)]);
  const kinds = [ga.special, gb.special];
  const isLine = (s: Special) => s === "lineH" || s === "lineV";
  let start: Pos[];
  let noTrigger = both;
  const blasts: Step["blasts"] = [
    { pos: b, special: gb.special === "none" ? ga.special : gb.special },
  ];

  if (kinds[0] === "prism" && kinds[1] === "prism") {
    start = allCells(grid);
  } else if (kinds.includes("prism")) {
    const other = ga.special === "prism" ? gb : ga;
    const targets = cellsOfColor(grid, other.color);
    if (other.special !== "none") {
      // Turn every gem of that colour into the same kind of special, then set them all off.
      for (const p of targets) {
        const g = grid[p.r][p.c]!;
        const special: Special = isLine(other.special) ? (randInt(ctx.rng, 2) ? "lineH" : "lineV") : other.special;
        grid[p.r][p.c] = { ...g, special };
      }
      noTrigger = new Set([key(ga.special === "prism" ? a : b)]);
    }
    start = [a, b, ...targets];
  } else {
    const area = new Map<string, Pos>();
    const add = (p: Pos) => inBounds(grid, p) && area.set(key(p), p);
    const lines = kinds.filter(isLine).length;
    const bombs = kinds.filter((k) => k === "bomb").length;
    if (lines === 2) {
      for (const q of blastArea(grid, b, "lineH")) add(q);
      for (const q of blastArea(grid, b, "lineV")) add(q);
    } else if (lines === 1 && bombs === 1) {
      for (let d = -1; d <= 1; d++) {
        for (const q of blastArea(grid, { r: b.r + d, c: b.c }, "lineH")) add(q);
        for (const q of blastArea(grid, { r: b.r, c: b.c + d }, "lineV")) add(q);
      }
    } else {
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add({ r: b.r + dr, c: b.c + dc });
    }
    start = [a, b, ...area.values()];
  }
  const res = clearChain(grid, start, ctx, noTrigger);
  res.blasts.unshift(...blasts);
  return finishStep(grid, res, [], 0, ctx);
}

/** Clears all current matches as one step, creating specials where earned. Returns null when nothing matches. */
function matchStep(grid: Grid, combo: number, ctx: ResolveContext, prefer: Pos[]): Step | null {
  const groups = findMatches(grid);
  if (groups.length === 0) return null;
  const created: Step["created"] = [];
  const start: Pos[] = [];
  for (const group of groups) {
    start.push(...group.cells);
    const special = specialFor(group);
    if (special === "none") continue;
    const preferred = prefer.find((p) => group.cells.some((q) => q.r === p.r && q.c === p.c));
    const sorted = [...group.cells].sort((x, y) => x.r - y.r || x.c - y.c);
    const pos = preferred ?? sorted[Math.floor(sorted.length / 2)];
    created.push({ pos, gem: makeGem(ctx, special === "prism" ? -1 : group.color, special) });
  }
  const res = clearChain(grid, start, ctx, new Set());
  return finishStep(grid, res, created, combo, ctx);
}

/** Runs cascades until the board settles. */
export function settle(grid: Grid, ctx: ResolveContext, firstCombo: number): Step[] {
  const steps: Step[] = [];
  for (let combo = firstCombo; combo < MAX_CASCADES; combo++) {
    const step = matchStep(grid, combo, ctx, []);
    if (!step) break;
    steps.push(step);
  }
  return steps;
}

export interface MoveResult {
  valid: boolean;
  steps: Step[];
  grid: Grid;
}

/** Plays one swap: validates, resolves the swap and every cascade. Does not mutate the input grid. */
export function playMove(input: Grid, a: Pos, b: Pos, ctx: ResolveContext): MoveResult {
  if (!isValidSwap(input, a, b)) return { valid: false, steps: [], grid: input };
  const grid = cloneGrid(input);
  const ga = grid[a.r][a.c]!;
  const gb = grid[b.r][b.c]!;
  const isCombo =
    ga.special === "prism" || gb.special === "prism" || (ga.special !== "none" && gb.special !== "none");
  swapIn(grid, a, b);
  const first = isCombo ? comboStep(grid, a, b, ctx) : matchStep(grid, 0, ctx, [a, b])!;
  const steps = [first, ...settle(grid, ctx, 1)];
  return { valid: true, steps, grid };
}

/** Booster: smashes one gem (setting off its special, if any) and settles the board. */
export function smash(input: Grid, p: Pos, ctx: ResolveContext): MoveResult {
  const grid = cloneGrid(input);
  if (!grid[p.r]?.[p.c]) return { valid: false, steps: [], grid: input };
  const res = clearChain(grid, [p], ctx, new Set());
  const first = finishStep(grid, res, [], 0, ctx);
  return { valid: true, steps: [first, ...settle(grid, ctx, 1)], grid };
}
