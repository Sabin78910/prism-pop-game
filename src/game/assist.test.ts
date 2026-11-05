import { assistMoves, loadAssist, recordResult, saveAssist, withAssist } from "./assist";
import { makeDailyLevel, makeLevel } from "./level";

describe("fair assist", () => {
  it("helps only after repeated losses, and caps the help", () => {
    expect([0, 1, 2, 3, 4, 9].map(assistMoves)).toEqual([0, 2, 4, 6, 6, 6]);
  });
  it("adds moves to the level without touching its goal or stars", () => {
    const lv = makeLevel(20);
    const { level, extra } = withAssist(lv, { 20: 2 }, true);
    expect(extra).toBe(4);
    expect(level.moves).toBe(lv.moves + 4);
    expect(level.objective).toEqual(lv.objective);
    expect(level.stars).toEqual(lv.stars);
  });
  it("deals one colour fewer after a long losing run, keeping the goal colour", () => {
    const lv = makeLevel(20);
    expect(withAssist(lv, { 20: 3 }, true).calm).toBe(false);
    const { level, calm } = withAssist(lv, { 20: 4 }, true);
    expect(calm).toBe(lv.colors > 4);
    expect(level.colors).toBe(calm ? lv.colors - 1 : lv.colors);
    const four = { ...lv, colors: 4 };
    expect(withAssist(four, { 20: 9 }, true).level.colors).toBe(4);
    const goalLast = { ...lv, colors: 5, objective: { kind: "collect" as const, color: 4, count: 10 } };
    expect(withAssist(goalLast, { 20: 9 }, true).calm).toBe(false);
  });
  it("does nothing when switched off or on the daily challenge", () => {
    expect(withAssist(makeLevel(20), { 20: 5 }, false).extra).toBe(0);
    expect(withAssist(makeDailyLevel(new Date(2026, 10, 3)), { 0: 9 }, true).extra).toBe(0);
  });
  it("counts losses per level and clears them on a win", () => {
    let log = recordResult({}, 7, false);
    log = recordResult(log, 7, false);
    expect(log[7]).toBe(2);
    log = recordResult(log, 7, true);
    expect(log[7]).toBeUndefined();
    expect(recordResult({}, 0, false)).toEqual({});
  });
  it("survives bad storage", () => {
    expect(loadAssist({ getItem: () => "not json" })).toEqual({});
    expect(loadAssist({ getItem: () => '{"3":2,"x":1,"4":-1}' })).toEqual({ 3: 2 });
    let saved = "";
    saveAssist({ setItem: (_k, v) => (saved = v) }, { 3: 2 });
    expect(saved).toBe('{"3":2}');
  });
});
