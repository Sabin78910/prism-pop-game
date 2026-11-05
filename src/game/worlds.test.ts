import { makeLevel } from "./level";
import { introFor, planFor, WORLD_IDS, WORLD_SIZE, worldIndex, worldRange, worldStars, upNext } from "./worlds";

describe("worlds", () => {
  it("splits levels into worlds of 15 and keeps the last world going", () => {
    expect(worldIndex(1)).toBe(0);
    expect(worldIndex(15)).toBe(0);
    expect(worldIndex(16)).toBe(1);
    expect(worldIndex(75)).toBe(4);
    expect(worldIndex(400)).toBe(WORLD_IDS.length - 1);
    expect(worldRange(1)).toEqual({ first: 16, last: 30 });
    expect(worldRange(4).last).toBe(Infinity);
  });

  it("follows a cluster: intro, develop, combine, boss", () => {
    expect([1, 3, 4, 10, 11, 14, 15].map((n) => planFor(n).stage)).toEqual([
      "intro", "intro", "develop", "develop", "combine", "combine", "boss",
    ]);
  });

  it("introduces each mechanic on its own first, then once only", () => {
    const intros = Array.from({ length: 90 }, (_, i) => [i + 1, introFor(i + 1)] as const).filter(([, m]) => m);
    expect(intros).toEqual([
      [16, "jelly"],
      [22, "doubleJelly"],
      [31, "ice"],
      [41, "blockers"],
      [71, "sixColors"],
    ]);
    // A world's first levels use only its new idea, with no obstacles mixed in.
    for (const n of [16, 17, 18, 31, 32, 33]) expect(planFor(n).blockers).toBe(false);
  });

  it("asks for a higher score at the end of a world than at its start", () => {
    for (let w = 0; w < WORLD_IDS.length; w++) {
      const first = w * WORLD_SIZE + 1;
      const a = makeLevel(first);
      const boss = makeLevel(first + WORLD_SIZE - 1);
      expect(a.stars[0]).toBeLessThan(boss.stars[0]);
    }
  });

  it("puts obstacles on later non-ice levels", () => {
    const lv = makeLevel(41);
    expect(lv.objective.kind).toBe("jelly");
    expect((lv.ice ?? []).flat().some((x) => x > 0)).toBe(true);
  });

  it("counts a world's stars", () => {
    expect(worldStars({ 1: 3, 2: 2, 16: 1 }, 0)).toEqual({ got: 5, max: 45 });
    expect(worldStars({ 76: 3 }, 4)).toEqual({ got: 0, max: 45 });
  });
});

describe("upNext", () => {
  it("counts down to the world's boss", () => {
    expect(upNext(1)).toEqual({ kind: "toBoss", world: "caves", left: 13 });
    expect(upNext(13)).toEqual({ kind: "toBoss", world: "caves", left: 1 });
  });
  it("flags the boss and the next world", () => {
    expect(upNext(14)).toEqual({ kind: "boss", world: "caves" });
    expect(upNext(15)).toEqual({ kind: "world", world: "garden" });
  });
  it("keeps a boss every world length in the endless last world", () => {
    expect(upNext(74)).toEqual({ kind: "boss", world: "spire" });
    expect(upNext(89)).toEqual({ kind: "boss", world: "spire" });
    expect(upNext(90)).toEqual({ kind: "toBoss", world: "spire", left: 14 });
  });
});
