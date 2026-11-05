import { WORLD_IDS, worldRange, type WorldId } from "./worlds";

/**
 * Board themes: cosmetic only, earned by finishing a world, never sold. Unlocks are derived from progress,
 * so nothing extra is stored or synced, and a theme can never be lost.
 */
export type ThemeId = "classic" | WorldId;
export const THEME_IDS: ThemeId[] = ["classic", ...WORLD_IDS];

export interface BoardTheme {
  /** Checkerboard tile colours. */
  tiles: [string, string];
  /** Board backing colour. */
  backing: string;
  /** Swatch shown in Settings. */
  swatch: string;
}

export const BOARD_THEMES: Record<ThemeId, BoardTheme> = {
  classic: { tiles: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.035)"], backing: "rgba(10,2,30,0.35)", swatch: "#6B4FA8" },
  caves: { tiles: ["rgba(62,224,255,0.16)", "rgba(62,224,255,0.07)"], backing: "rgba(4,20,40,0.55)", swatch: "#3EE0FF" },
  garden: { tiles: ["rgba(255,111,181,0.16)", "rgba(255,111,181,0.07)"], backing: "rgba(36,6,34,0.55)", swatch: "#FF6FB5" },
  frost: { tiles: ["rgba(200,236,255,0.2)", "rgba(200,236,255,0.09)"], backing: "rgba(8,24,44,0.55)", swatch: "#A8E4FF" },
  forge: { tiles: ["rgba(255,179,71,0.17)", "rgba(255,179,71,0.07)"], backing: "rgba(40,14,2,0.55)", swatch: "#FFB347" },
  spire: { tiles: ["rgba(197,140,255,0.2)", "rgba(120,220,255,0.08)"], backing: "rgba(20,6,50,0.6)", swatch: "#C58CFF" },
};

/** A world's theme unlocks once its last level is beaten. The endless last world unlocks at its 15th level. */
export function themeUnlocked(id: ThemeId, unlockedLevel: number): boolean {
  if (id === "classic") return true;
  const w = WORLD_IDS.indexOf(id);
  const { first } = worldRange(w);
  return unlockedLevel > first + 14;
}

/** The theme to draw: the chosen one if earned, otherwise classic. */
export function activeTheme(chosen: string | undefined, unlockedLevel: number): ThemeId {
  const id = THEME_IDS.find((t) => t === chosen);
  return id && themeUnlocked(id, unlockedLevel) ? id : "classic";
}
