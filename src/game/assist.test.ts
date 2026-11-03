import { assistMoves, loadAssist, recordResult, saveAssist, withAssist } from "./assist";
import { makeDailyLevel, makeLevel } from "./level";

describe("fair assist", () => {
  it("helps only after repeated losses, and caps the help", () => {
    expect([0, 1, 2, 3, 4, 9].map(assistMoves)).toEqual([0, 0, 3, 3, 5, 5]);
  });
  it("adds moves to the level without touching its goal or stars", () => {
    const lv = makeLevel(20);
    const { level, extra } = withAssist(lv, { 20: 2 }, true);
    expect(extra).toBe(3);
    expect(level.moves).toBe(lv.moves + 3);
    expect(level.objective).toEqual(lv.objective);
    expect(level.stars).toEqual(lv.stars);
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
