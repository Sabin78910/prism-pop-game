import { createRng, hashString, randInt } from "./rng";
import type { Level, Objective } from "./types";

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

/** Builds level n (1-based). Same number always gives the same level on every device. */
export function makeLevel(n: number, seed = hashString(`prism-pop-level-${n}`)): Level {
  const rng = createRng(seed);
  const colors = n < 6 ? 4 : n < 20 ? 5 : 6;
  const kind = n <= 2 ? "score" : (["collect", "jelly", "score"] as const)[n % 3];
  let jelly = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  let objective: Objective;
  let moves: number;
  if (kind === "jelly") {
    const pattern = PATTERNS[(n + randInt(rng, PATTERNS.length)) % PATTERNS.length];
    jelly = pattern.map((row) => [...row].map((ch) => (ch === "." ? 0 : Number(ch))));
    const count = jelly.flat().filter((x) => x > 0).length;
    objective = { kind: "jelly", count };
    moves = 22 + Math.round(count / 4);
  } else if (kind === "collect") {
    const count = 18 + Math.min(42, Math.floor(n * 1.2));
    objective = { kind: "collect", color: randInt(rng, colors), count };
    moves = 20 + Math.round(count / 6);
  } else {
    const target = 3000 + n * 450;
    objective = { kind: "score", target };
    moves = 20 + (n % 4);
  }
  // Gentle difficulty: fewer spare moves as levels rise, never below 15.
  moves = Math.max(15, moves - Math.floor(n / 15));
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
