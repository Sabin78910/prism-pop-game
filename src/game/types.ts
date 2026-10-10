export type Special = "none" | "lineH" | "lineV" | "bomb" | "prism";

/** A gem on the board. `color` is 0..colors-1; prisms have color -1 (they match no colour). */
export interface Gem {
  id: number;
  color: number;
  special: Special;
}

export type Grid = (Gem | null)[][]; // grid[row][col]

export interface Pos {
  r: number;
  c: number;
}

export type Objective =
  | { kind: "score"; target: number }
  | { kind: "collect"; color: number; count: number }
  | { kind: "jelly"; count: number };

export interface Level {
  number: number;
  seed: number;
  rows: number;
  cols: number;
  colors: number;
  moves: number;
  objective: Objective;
  /** jelly[r][c] = layers of jelly under that cell (0..2). */
  jelly: number[][];
  /** Score needed for 1, 2 and 3 stars. */
  stars: [number, number, number];
}

/** One cascade step, produced by the resolver for the renderer to animate. */
export interface Step {
  cleared: { pos: Pos; gem: Gem }[];
  created: { pos: Pos; gem: Gem }[];
  /** Grid after clearing and creating specials, before gravity. */
  afterClear: Grid;
  /** Grid after gravity and refill. */
  afterFall: Grid;
  /** Gems that entered from above in this step, with how many rows above the board they start. */
  spawned: { id: number; c: number; startRow: number }[];
  score: number;
  /** 0 for the player's move, 1+ for each cascade. */
  combo: number;
  /** Specials that went off, for effects. */
  blasts: { pos: Pos; special: Special }[];
}
