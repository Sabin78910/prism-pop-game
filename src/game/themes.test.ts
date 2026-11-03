import { activeTheme, BOARD_THEMES, THEME_IDS, themeUnlocked } from "./themes";

describe("board themes", () => {
  it("has a theme for classic and every world", () => {
    expect(THEME_IDS).toEqual(["classic", "caves", "garden", "frost", "forge", "spire"]);
    for (const id of THEME_IDS) expect(BOARD_THEMES[id].tiles).toHaveLength(2);
  });
  it("unlocks a world's theme only after its last level is beaten", () => {
    expect(themeUnlocked("classic", 1)).toBe(true);
    expect(themeUnlocked("caves", 15)).toBe(false);
    expect(themeUnlocked("caves", 16)).toBe(true);
    expect(themeUnlocked("garden", 31)).toBe(true);
    expect(themeUnlocked("spire", 75)).toBe(false);
    expect(themeUnlocked("spire", 76)).toBe(true);
  });
  it("falls back to classic for a locked or unknown choice", () => {
    expect(activeTheme("frost", 10)).toBe("classic");
    expect(activeTheme("frost", 46)).toBe("frost");
    expect(activeTheme("bogus", 99)).toBe("classic");
    expect(activeTheme(undefined, 99)).toBe("classic");
  });
});
