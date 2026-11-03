/** Combo words grow with the cascade count. Original wording, in English and Nepali. */
const WORDS_EN = ["Nice!", "Sparkling!", "Dazzling!", "Prismatic!", "Legendary!"];
const WORDS_NE = ["राम्रो!", "चम्किलो!", "अद्भुत!", "इन्द्रेणी!", "महान!"];

export function comboWord(combo: number, cleared: number, lang: "en" | "ne"): string | null {
  const words = lang === "ne" ? WORDS_NE : WORDS_EN;
  const power = combo + (cleared >= 12 ? 2 : cleared >= 7 ? 1 : 0);
  if (power < 1) return null;
  return words[Math.min(words.length - 1, power - 1)];
}

/** Pitch for a clear sound: rises a semitone-ish step per cascade, capped. */
export function popFrequency(combo: number): number {
  return 440 * Math.pow(2, Math.min(combo, 12) / 6);
}

/** Vibration pattern (ms) by intensity; empty when the player turned haptics off. */
export function hapticPattern(kind: "tap" | "match" | "blast" | "star" | "win", enabled: boolean): number[] {
  if (!enabled) return [];
  return { tap: [8], match: [14], blast: [30, 30, 40], star: [12, 40, 24], win: [20, 40, 20, 40, 60] }[kind];
}

/** Score shown counting up towards the real value. */
export function easeTowards(shown: number, target: number, dtMs: number): number {
  if (shown >= target) return target;
  const step = Math.max(1, (target - shown) * Math.min(1, dtMs / 120));
  return Math.min(target, Math.round(shown + step));
}

/** Floating "+score" shown where a clear happened; bigger cascades get bigger numbers. */
export function scorePopup(score: number, combo: number): { text: string; scale: number } | null {
  if (score <= 0) return null;
  return { text: `+${score.toLocaleString("en-US")}`, scale: 0.42 + Math.min(combo, 4) * 0.08 };
}

/** Indices of star thresholds the shown score crossed between two frames. */
export function starsCrossed(prev: number, next: number, thresholds: readonly number[]): number[] {
  return thresholds.flatMap((t, i) => (prev < t && next >= t ? [i] : []));
}

/**
 * Honest near miss: a real percentage of the goal, shown only when the player genuinely got close.
 * Never invented, never shown on a win.
 */
export function nearMissPercent(progress: number): number | null {
  if (progress < 0.7 || progress >= 1) return null;
  return Math.min(99, Math.floor(progress * 100));
}

/** A personal best only counts once there is an earlier score to beat. */
export function isNewBest(previousBest: number | undefined, score: number): boolean {
  return (previousBest ?? 0) > 0 && score > (previousBest ?? 0);
}
