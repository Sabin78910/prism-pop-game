import { allKeysTranslated, num, t, toNepaliDigits } from "./i18n";
import { comboWord, easeTowards, hapticPattern, isNewBest, nearMissPercent, popFrequency, scorePopup, starsCrossed } from "./game/feedback";
import { registerServiceWorker } from "./registerSW";

describe("i18n", () => {
  it("has a Nepali string for every key", () => {
    expect(allKeysTranslated()).toBe(true);
  });
  it("fills variables and converts digits in Nepali", () => {
    expect(t("en", "goalJelly", { n: 12 })).toBe("Clear 12 jelly tiles");
    expect(t("ne", "goalJelly", { n: 12 })).toContain("१२");
    expect(toNepaliDigits("2026")).toBe("२०२६");
    expect(num("en", 12345)).toBe("12,345");
    expect(num("ne", 12345)).toBe("१२,३४५");
  });
});

describe("feedback", () => {
  it("shows no word for a plain first match", () => {
    expect(comboWord(0, 3, "en")).toBeNull();
  });
  it("grows the word with cascades and big clears, capped", () => {
    expect(comboWord(1, 3, "en")).toBe("Nice!");
    expect(comboWord(0, 12, "en")).toBe("Sparkling!");
    expect(comboWord(20, 30, "en")).toBe("Legendary!");
    expect(comboWord(1, 3, "ne")).toBe("राम्रो!");
  });
  it("raises pitch with combo and caps it", () => {
    expect(popFrequency(1)).toBeGreaterThan(popFrequency(0));
    expect(popFrequency(50)).toBe(popFrequency(12));
  });
  it("respects the haptics setting", () => {
    expect(hapticPattern("blast", false)).toEqual([]);
    expect(hapticPattern("tap", true).length).toBeGreaterThan(0);
  });
  it("counts the score up without overshooting", () => {
    let s = 0;
    for (let i = 0; i < 100; i++) s = easeTowards(s, 1000, 16);
    expect(s).toBe(1000);
    expect(easeTowards(1200, 1000, 16)).toBe(1000);
  });
});

describe("service worker", () => {
  it("registers only in production", () => {
    const register = vi.fn(() => Promise.resolve());
    expect(registerServiceWorker(false, { register })).toBe(false);
    expect(registerServiceWorker(true, { register })).toBe(true);
    expect(register).toHaveBeenCalledWith("./sw.js");
  });
});

describe("reward feedback", () => {
  it("shows the points earned, larger for bigger cascades", () => {
    expect(scorePopup(0, 0)).toBeNull();
    expect(scorePopup(1200, 0)?.text).toBe("+1,200");
    expect(scorePopup(60, 3)!.scale).toBeGreaterThan(scorePopup(60, 0)!.scale);
    expect(scorePopup(60, 99)!.scale).toBe(scorePopup(60, 4)!.scale);
  });
  it("reports each star threshold crossed, once", () => {
    const stars = [1000, 2000, 3000];
    expect(starsCrossed(900, 1000, stars)).toEqual([0]);
    expect(starsCrossed(1000, 1500, stars)).toEqual([]);
    expect(starsCrossed(500, 3200, stars)).toEqual([0, 1, 2]);
  });
  it("only calls a loss a near miss when the player was genuinely close", () => {
    expect(nearMissPercent(0.5)).toBeNull();
    expect(nearMissPercent(0.87)).toBe(87);
    expect(nearMissPercent(0.999)).toBe(99);
    expect(nearMissPercent(1)).toBeNull();
  });
  it("counts a personal best only when beating an earlier score", () => {
    expect(isNewBest(undefined, 500)).toBe(false);
    expect(isNewBest(400, 500)).toBe(true);
    expect(isNewBest(500, 500)).toBe(false);
  });
  it("has a distinct haptic for a star", () => {
    expect(hapticPattern("star", true).length).toBeGreaterThan(0);
    expect(hapticPattern("star", false)).toEqual([]);
  });
});
