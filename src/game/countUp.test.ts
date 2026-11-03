import { describe, expect, it } from "vitest";
import { coinFlightCount, countUpAt, countUpDuration, walletDelay } from "./countUp";

describe("count-up", () => {
  it("scales its length with the jump but stays between 300 and 1200ms", () => {
    expect(countUpDuration(0)).toBe(300);
    expect(countUpDuration(25)).toBe(500);
    expect(countUpDuration(1_000_000)).toBe(1200);
    expect(countUpDuration(-25)).toBe(500);
  });

  it("starts at the old value, ends exactly on the new one and never overshoots", () => {
    expect(countUpAt(100, 250, 0, 500)).toBe(100);
    expect(countUpAt(100, 250, 500, 500)).toBe(250);
    expect(countUpAt(100, 250, 9999, 500)).toBe(250);
    let prev = 100;
    for (let t = 0; t <= 500; t += 25) {
      const v = countUpAt(100, 250, t, 500);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(250);
      prev = v;
    }
  });

  it("eases out: most of the change happens early", () => {
    expect(countUpAt(0, 1000, 250, 500)).toBeGreaterThan(800);
  });

  it("jumps straight to the value when there is no time to animate", () => {
    expect(countUpAt(5, 9, 0, 0)).toBe(9);
  });
});

describe("coin flight", () => {
  it("sends a few coins for small rewards, more for big ones, capped at 10", () => {
    expect(coinFlightCount(0)).toBe(0);
    expect(coinFlightCount(5)).toBe(3);
    expect(coinFlightCount(30)).toBe(6);
    expect(coinFlightCount(500)).toBe(10);
  });

  it("starts the wallet count as the first coin lands", () => {
    expect(walletDelay(0)).toBe(0);
    expect(walletDelay(4)).toBeGreaterThan(0);
  });
});
