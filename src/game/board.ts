import type { Gem, Grid, Pos, Special } from "./types";
import { randInt, type Rng } from "./rng";

export interface IdSource {
  nextId: number;
}

export function makeGem(ids: IdSource, color: number, special: Special = "none"): Gem {
  return { id: ids.nextId++, color, special };
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

export const key = (p: Pos) => `${p.r},${p.c}`;

export function inBounds(grid: Grid, p: Pos): boolean {
  return p.r >= 0 && p.c >= 0 && p.r < grid.length && p.c < grid[0].length;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export interface MatchGroup {
  cells: Pos[];
  color: number;
  hasH: boolean;
  hasV: boolean;
  longest: number;
}

interface Run {
  cells: Pos[];
  dir: "h" | "v";
}

function findRuns(grid: Grid): Run[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const runs: Run[] = [];
  const scan = (dir: "h" | "v") => {
    const outer = dir === "h" ? rows : cols;
    const inner = dir === "h" ? cols : rows;
    for (let o = 0; o < outer; o++) {
      let start = 0;
      for (let i = 1; i <= inner; i++) {
        const at = (k: number) => (dir === "h" ? grid[o][k] : grid[k][o]);
        const prev = at(start);
        const cur = i < inner ? at(i) : null;
        const same = cur && prev && prev.color >= 0 && cur.color === prev.color;
        if (!same) {
          if (prev && prev.color >= 0 && i - start >= 3) {
            const cells: Pos[] = [];
            for (let k = start; k < i; k++) cells.push(dir === "h" ? { r: o, c: k } : { r: k, c: o });
            runs.push({ cells, dir });
          }
          start = i;
        }
      }
    }
  };
  scan("h");
  scan("v");
  return runs;
}

/** All matches of 3+ in a line, with runs that share a cell merged (L, T and + shapes). */
export function findMatches(grid: Grid): MatchGroup[] {
  const runs = findRuns(grid);
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<string, number>();
  runs.forEach((run, i) => {
    for (const p of run.cells) {
      const k = key(p);
      const j = owner.get(k);
      if (j !== undefined) parent[find(i)] = find(j);
      else owner.set(k, i);
    }
  });
  const groups = new Map<number, MatchGroup>();
  runs.forEach((run, i) => {
    const root = find(i);
    let g = groups.get(root);
    if (!g) {
      g = { cells: [], color: grid[run.cells[0].r][run.cells[0].c]!.color, hasH: false, hasV: false, longest: 0 };
      groups.set(root, g);
    }
    const seen = new Set(g.cells.map(key));
    for (const p of run.cells) if (!seen.has(key(p))) g.cells.push(p);
    if (run.dir === "h") g.hasH = true;
    else g.hasV = true;
    g.longest = Math.max(g.longest, run.cells.length);
  });
  return [...groups.values()];
}

/** Which special a match group earns: 5 in a line → prism, L/T → bomb, 4 → line. */
export function specialFor(group: MatchGroup): Special {
  if (group.longest >= 5) return "prism";
  if (group.hasH && group.hasV) return "bomb";
  if (group.longest === 4) return group.hasH ? "lineV" : "lineH";
  return "none";
}

/** Fills a fresh board with no ready-made matches and at least one move. */
export function createGrid(rows: number, cols: number, colors: number, rng: Rng, ids: IdSource): Grid {
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid: Grid = [];
    for (let r = 0; r < rows; r++) {
      const row: (Gem | null)[] = [];
      for (let c = 0; c < cols; c++) {
        let color = randInt(rng, colors);
        for (let guard = 0; guard < 10; guard++) {
          const left = c >= 2 && row[c - 1]!.color === color && row[c - 2]!.color === color;
          const up = r >= 2 && grid[r - 1][c]!.color === color && grid[r - 2][c]!.color === color;
          if (!left && !up) break;
          color = (color + 1) % colors;
        }
        row.push(makeGem(ids, color));
      }
      grid.push(row);
    }
    if (findHint(grid)) return grid;
  }
  throw new Error("could not build a playable board");
}

function swapIn(grid: Grid, a: Pos, b: Pos): void {
  const t = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = t;
}

/** True when swapping a and b is a legal move (makes a match or fires a special combo). */
export function isValidSwap(grid: Grid, a: Pos, b: Pos): boolean {
  if (!inBounds(grid, a) || !inBounds(grid, b) || !isAdjacent(a, b)) return false;
  const ga = grid[a.r][a.c];
  const gb = grid[b.r][b.c];
  if (!ga || !gb) return false;
  if (ga.special === "prism" || gb.special === "prism") return true;
  if (ga.special !== "none" && gb.special !== "none") return true;
  const g = cloneGrid(grid);
  swapIn(g, a, b);
  return findMatches(g).length > 0;
}

/** Finds one legal move, preferring the one that clears the most gems. */
export function findHint(grid: Grid): [Pos, Pos] | null {
  let best: [Pos, Pos] | null = null;
  let bestSize = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      for (const b of [
        { r, c: c + 1 },
        { r: r + 1, c },
      ]) {
        const a = { r, c };
        if (!isValidSwap(grid, a, b)) continue;
        const g = cloneGrid(grid);
        swapIn(g, a, b);
        const size = findMatches(g).reduce((n, m) => n + m.cells.length, 0) || 10;
        if (size > bestSize) {
          bestSize = size;
          best = [a, b];
        }
      }
    }
  }
  return best;
}

/** Shuffles gem positions (keeping gem ids) until there are no matches and a move exists. */
export function shuffleGrid(grid: Grid, rng: Rng): Grid {
  const gems = grid.flat().filter((g): g is Gem => g !== null);
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = gems.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      [gems[i], gems[j]] = [gems[j], gems[i]];
    }
    let k = 0;
    const next: Grid = grid.map((row) => row.map((cell) => (cell ? gems[k++] : null)));
    if (findMatches(next).length === 0 && findHint(next)) return next;
  }
  return grid;
}

export { swapIn };
