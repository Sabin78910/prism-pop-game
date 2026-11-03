/**
 * Five worlds of 15 levels. Each world teaches one idea in a cluster: a few gentle intro levels with the new
 * mechanic on its own, then variations, then levels that mix it with what came before, then a boss level.
 * Levels past the last world keep going in the last world's style, so play never runs out.
 */
export const WORLD_SIZE = 15;

export const WORLD_IDS = ["caves", "garden", "frost", "forge", "spire"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

/** Accent colours for the world's map chapter and board frame. */
export const WORLD_THEME: Record<WorldId, { accent: string; deep: string }> = {
  caves: { accent: "#3EE0FF", deep: "#0A2140" },
  garden: { accent: "#FF6FB5", deep: "#2E0B33" },
  frost: { accent: "#A8E4FF", deep: "#0E2238" },
  forge: { accent: "#FFB347", deep: "#331405" },
  spire: { accent: "#C58CFF", deep: "#1C0B3D" },
};

/** Something new the player meets for the first time; the game shows a short card for it. */
export type Mechanic = "jelly" | "doubleJelly" | "ice" | "blockers" | "sixColors";

export type Stage = "intro" | "develop" | "combine" | "boss";
export type Kind = "score" | "collect" | "jelly" | "ice";

export interface LevelPlan {
  world: number;
  /** 0-based position inside the world. */
  index: number;
  stage: Stage;
  kind: Kind;
  colors: number;
  /** Jelly may have two layers. */
  double: boolean;
  /** Frozen gems sprinkled on non-ice levels as obstacles. */
  blockers: boolean;
}

/** Objective per position in a world: S score, C collect, J jelly, I ice. */
const ORDER: Record<WorldId, string> = {
  caves: "SSCSCSCSCSCCSCC",
  garden: "JJJCJSJJCJJCJSJ",
  frost: "IIIJICIIJIJICII",
  forge: "JIJCIJISJIJCIJI",
  spire: "IJCIJSIJCJIJCJI",
};
const KIND: Record<string, Kind> = { S: "score", C: "collect", J: "jelly", I: "ice" };

export function worldIndex(n: number): number {
  return Math.min(WORLD_IDS.length - 1, Math.floor((Math.max(1, n) - 1) / WORLD_SIZE));
}

/** First and last level numbers of a world; the last world never ends. */
export function worldRange(w: number): { first: number; last: number } {
  return { first: w * WORLD_SIZE + 1, last: w === WORLD_IDS.length - 1 ? Infinity : (w + 1) * WORLD_SIZE };
}

export function stageOf(index: number): Stage {
  return index < 3 ? "intro" : index < 10 ? "develop" : index < 14 ? "combine" : "boss";
}

export function planFor(n: number): LevelPlan {
  const world = worldIndex(n);
  const index = (Math.max(1, n) - 1) % WORLD_SIZE;
  const stage = stageOf(index);
  const id = WORLD_IDS[world];
  const kind = KIND[ORDER[id][index]];
  const late = stage === "combine" || stage === "boss";
  const colors = world === 0 && index < 5 ? 4 : world === 4 && late ? 6 : 5;
  const double = (world === 1 && index >= 6) || world >= 3;
  const blockers = kind !== "ice" && ((world === 2 && late) || world >= 3);
  return { world, index, stage, kind, colors, double, blockers };
}

function mechanicsOf(p: LevelPlan): Mechanic[] {
  const out: Mechanic[] = [];
  if (p.kind === "jelly") out.push(p.double ? "doubleJelly" : "jelly");
  if (p.kind === "ice") out.push("ice");
  if (p.blockers) out.push("blockers");
  if (p.colors >= 6) out.push("sixColors");
  return out;
}

/** The mechanic level n shows for the first time, if any. Only plain jelly comes before double jelly. */
export function introFor(n: number): Mechanic | null {
  const seen = new Set<Mechanic>();
  for (let m = 1; m < Math.min(n, WORLD_SIZE * WORLD_IDS.length + 1); m++) for (const x of mechanicsOf(planFor(m))) seen.add(x);
  return mechanicsOf(planFor(n)).find((x) => !seen.has(x)) ?? null;
}

/** Stars earned in a world and the most it can give (its levels times 3). */
export function worldStars(stars: Record<number, number>, w: number): { got: number; max: number } {
  const { first, last } = worldRange(w);
  const end = Number.isFinite(last) ? last : first + WORLD_SIZE - 1;
  let got = 0;
  for (let n = first; n <= end; n++) got += stars[n] ?? 0;
  return { got, max: (end - first + 1) * 3 };
}
