import type { Pos, Special, Step } from "./types";

/** A short-lived board effect the canvas draws on top of the gems. Positions are in cells. */
export interface Effect {
  kind: "beamH" | "beamV" | "ring" | "rays" | "flash";
  r: number;
  c: number;
  /** Seconds the effect lasts at full motion. */
  duration: number;
}

const BLAST_FX: Record<Exclude<Special, "none">, Effect["kind"][]> = {
  lineH: ["beamH"],
  lineV: ["beamV"],
  bomb: ["ring"],
  prism: ["rays", "ring"],
};

/** Effects for one cascade step: a beam for each line blaster, a shockwave for bombs, light rays for prisms. */
export function stepEffects(step: Pick<Step, "blasts" | "created">): Effect[] {
  const out: Effect[] = [];
  const at = (p: Pos) => ({ r: p.r + 0.5, c: p.c + 0.5 });
  for (const b of step.blasts) {
    if (b.special === "none") continue;
    for (const kind of BLAST_FX[b.special]) out.push({ kind, ...at(b.pos), duration: kind === "rays" ? 0.6 : kind === "ring" ? 0.45 : 0.35 });
  }
  for (const c of step.created) out.push({ kind: "flash", ...at(c.pos), duration: 0.4 });
  return out;
}

/**
 * Hit-stop: a tiny freeze before a big blast resolves, so the impact reads. Grows with the number of blasts,
 * capped so a long chain never feels stuck. None with reduced motion.
 */
export function hitStopMs(blasts: number, reducedMotion: boolean): number {
  if (reducedMotion || blasts <= 0) return 0;
  return Math.min(140, 50 + (blasts - 1) * 30);
}

/** 0..1 progress of an effect, eased out so it starts fast and settles. */
export function effectProgress(age: number, duration: number): number {
  const t = Math.min(1, Math.max(0, age / duration));
  return 1 - Math.pow(1 - t, 3);
}
