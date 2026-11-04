import { describe, expect, it } from "vitest";
import { DEFAULT_THINK, hintDelay, learnPace, loadPace, savePace } from "./pace";

describe("adaptive hint timing", () => {
  it("starts close to the old 5 to 6 second hint", () => {
    expect(hintDelay(DEFAULT_THINK)).toBe(6000);
  });

  it("a fast player gets hints later than their usual pace, never sooner than 4s", () => {
    let avg = DEFAULT_THINK;
    for (let i = 0; i < 30; i++) avg = learnPace(avg, 1000);
    expect(avg).toBeLessThan(1200);
    expect(hintDelay(avg)).toBe(4000);
  });

  it("a slow player still gets help within 10 seconds", () => {
    let avg = DEFAULT_THINK;
    for (let i = 0; i < 30; i++) avg = learnPace(avg, 60000);
    expect(hintDelay(avg)).toBe(10000);
  });

  it("ignores accidental taps and bad numbers", () => {
    expect(learnPace(3000, 50)).toBe(3000);
    expect(learnPace(3000, Number.NaN)).toBe(3000);
  });

  it("round trips through storage and rejects junk", () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(loadPace(s)).toBe(DEFAULT_THINK);
    savePace(s, 2400);
    expect(loadPace(s)).toBe(2400);
    m.set("prism-pop.pace", "nope");
    expect(loadPace(s)).toBe(DEFAULT_THINK);
  });
});
