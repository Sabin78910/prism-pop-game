import { allKeysTranslated, num, t, toNepaliDigits } from "./i18n";
import { comboWord, easeTowards, hapticPattern, popFrequency } from "./game/feedback";
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
