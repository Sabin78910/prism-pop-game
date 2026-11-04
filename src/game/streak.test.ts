import { describe, expect, it } from "vitest";
import { loadStreak, nextStreak, saveStreak, streakBonus } from "./streak";

describe("win streak", () => {
  it("grows on wins and resets on a loss", () => {
    expect(nextStreak(0, true)).toBe(1);
    expect(nextStreak(4, true)).toBe(5);
    expect(nextStreak(4, false)).toBe(0);
  });
  it("pays a growing, capped bonus from two wins in a row", () => {
    expect([1, 2, 3, 5, 11, 40].map(streakBonus)).toEqual([0, 5, 10, 20, 50, 50]);
  });
  it("survives bad storage", () => {
    expect(loadStreak({ getItem: () => "junk" })).toBe(0);
    expect(loadStreak({ getItem: () => "-3" })).toBe(0);
    let saved = "";
    saveStreak({ setItem: (_k, v) => (saved = v) }, 3);
    expect(loadStreak({ getItem: () => saved })).toBe(3);
  });
});
