import { describe, expect, it } from "vitest";
import { levelGain, pointsFor, rankFor, rankPoints, stepOf, tierOf, TIERS, TOP_STEP } from "./ranks";

describe("ranks", () => {
  it("starts at Bronze V with nothing played", () => {
    const r = rankFor(rankPoints({}));
    expect(r).toMatchObject({ points: 0, step: 0, tier: "bronze", division: "V", toNext: 120 });
  });

  it("pays only for new stars and the first clear", () => {
    expect(levelGain(0, 1)).toBe(60);
    expect(levelGain(0, 3)).toBe(140);
    expect(levelGain(1, 3)).toBe(80);
    expect(levelGain(3, 3)).toBe(0);
    expect(levelGain(2, 1)).toBe(0);
  });

  it("adds up points from saved stars and ignores the daily board", () => {
    expect(rankPoints({ 1: 3, 2: 1, 0: 3 })).toBe(200);
  });

  it("walks every tier in order from Bronze to King", () => {
    const seen: string[] = [];
    for (let s = 0; s <= TOP_STEP; s++) if (seen.at(-1) !== tierOf(s)) seen.push(tierOf(s));
    expect(seen).toEqual([...TIERS]);
    expect(tierOf(TOP_STEP)).toBe("king");
  });

  it("is monotonic and round-trips step to points", () => {
    for (let s = 1; s <= TOP_STEP; s++) {
      expect(pointsFor(s)).toBeGreaterThan(pointsFor(s - 1));
      expect(stepOf(pointsFor(s))).toBe(s);
      expect(stepOf(pointsFor(s) - 1)).toBe(s - 1);
    }
  });

  it("names divisions only up to Crown and fills to 1 at King", () => {
    expect(rankFor(1500).tier).toBe("gold");
    expect(rankFor(1500).division).toBe("V");
    expect(rankFor(6500)).toMatchObject({ tier: "master", division: "" });
    expect(rankFor(99999)).toMatchObject({ tier: "king", fill: 1, toNext: 0 });
  });

  it("reaches King after about 100 three-star levels", () => {
    const stars: Record<number, number> = {};
    for (let n = 1; n <= 100; n++) stars[n] = 3;
    expect(rankFor(rankPoints(stars)).tier).toBe("king");
    delete stars[100];
    expect(rankFor(rankPoints(stars)).tier).toBe("legend");
  });
});
