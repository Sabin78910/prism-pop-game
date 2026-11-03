import { createRng, hashString, randInt } from "./rng";
import type { Level, Objective } from "./types";
import { planFor } from "./worlds";

const ROWS = 9;
const COLS = 8;

/** Symmetric jelly patterns, as row strings for the 9x8 board ('1'/'2' = layers). */
const PATTERNS: string[][] = [
  ["........", "........", "..1111..", "..1111..", "..1111..", "..1111..", "..1111..", "........", "........"],
  ["11....11", "11....11", "........", "...11...", "..1111..", "...11...", "........", "11....11", "11....11"],
  ["........", ".1....1.", "..1..1..", "...11...", "...22...", "...11...", "..1..1..", ".1....1.", "........"],
  ["11111111", "........", "........", "........", "22222222", "........", "........", "........", "11111111"],
  ["1......1", ".1....1.", "..1111..", "..2222..", "..2222..", "..2222..", "..1111..", ".1....1.", "1......1"],
];

/** Smaller shapes for a world's first levels, so a new mechanic is met on a forgiving board. */
const SMALL: string[][] = [
  ["........", "........", "........", "..1111..", "..1111..", "..1111..", "........", "........", "........"],
  ["........", "........", "...11...", "..1..1..", ".1....1.", "..1..1..", "...11...", "........", "........"],
  ["........", "........", "........", "........", "11111111", "........", "........", "........", "........"],
];

/** Sparse frozen gems used as obstacles on levels whose goal is something else. */
const BLOCKERS: string[][] = [
  ["........", "........", "........", "1......1", "1......1", "1......1", "........", "........", "........"],
  ["........", "........", "...11...", "........", "........", "........", "...11...", "........", "........"],
  ["........", ".1....1.", "........", "........", "........", "........", "........", ".1....1.", "........"],
];

const toGrid = (rows: string[], cap: number) => rows.map((row) => [...row].map((ch) => (ch === "." ? 0 : Math.min(cap, Number(ch)))));
const cells = (g: number[][]) => g.flat().filter((x) => x > 0).length;

/**
 * Builds level n (1-based). Same number always gives the same level on every device.
 * The world plan decides the goal and which mechanics appear; the seed decides the exact shape.
 */
export function makeLevel(n: number, seed = hashString(`prism-pop-level-${n}`)): Level {
  const rng = createRng(seed);
  const plan = planFor(n);
  const { kind, colors, stage } = plan;
  const shapes = stage === "intro" ? SMALL : PATTERNS;
  const pick = (list: string[][]) => list[(n + randInt(rng, list.length)) % list.length];
  let ice: number[][] | undefined;
  let jelly = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  let objective: Objective;
  let moves: number;
  if (kind === "jelly") {
    jelly = toGrid(pick(shapes), plan.double ? 2 : 1);
    const count = cells(jelly);
    const layers = jelly.flat().reduce((a, b) => a + b, 0);
    objective = { kind: "jelly", count };
    moves = 22 + Math.round(layers / 3);
  } else if (kind === "ice") {
    ice = toGrid(pick(shapes), plan.double && stage !== "intro" ? 2 : 1);
    const count = cells(ice);
    const layers = ice.flat().reduce((a, b) => a + b, 0);
    objective = { kind: "ice", count };
    moves = 26 + Math.round(layers * 0.7);
  } else if (kind === "collect") {
    const count = 18 + Math.min(30, Math.floor(n * 0.5));
    objective = { kind: "collect", color: randInt(rng, colors), count };
    moves = 20 + Math.round(count / 6);
  } else {
    const target = 3000 + n * 450;
    objective = { kind: "score", target };
    moves = 20 + (n % 4);
  }
  if (plan.blockers) {
    ice = toGrid(pick(BLOCKERS), 1);
    moves += 3;
  }
  // A sixth colour makes matches rarer, so it pays for itself in moves.
  if (colors >= 6) moves += 7;
  // New ideas get room to breathe; mixed levels and the boss ask for more. Past the last world, spare moves
  // shrink slowly, never below 15.
  moves += { intro: 4, develop: 0, combine: -1, boss: -2 }[stage];
  moves = Math.max(15, moves - Math.max(0, Math.floor((n - 75) / 15)));
  const base = objective.kind === "score" ? objective.target : 1500 + n * 300;
  return {
    number: n,
    seed,
    rows: ROWS,
    cols: COLS,
    colors,
    moves,
    objective,
    jelly,
    ...(ice ? { ice } : {}),
    stars: [base, Math.round(base * 1.6), Math.round(base * 2.3)],
  };
}

/** Today's challenge, keyed by the local date so everyone gets the same board that day. */
export function dailyKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function makeDailyLevel(date: Date): Level {
  const k = dailyKey(date);
  const seed = hashString(`prism-pop-daily-${k}`);
  const n = 12 + (seed % 25);
  return { ...makeLevel(n, seed), number: 0 };
}
