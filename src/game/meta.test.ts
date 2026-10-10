import { findHint } from "./board";
import { dailyKey, makeDailyLevel, makeLevel } from "./level";
import {
  buyBooster,
  liveStreak,
  loadProgress,
  newProgress,
  recordDaily,
  recordWin,
  saveProgress,
  spendBooster,
} from "./progress";
import { coinReward, objectiveProgress, startSession, starsFor, swap, useBooster } from "./session";

describe("makeLevel", () => {
  it("is deterministic", () => {
    expect(makeLevel(17)).toEqual(makeLevel(17));
  });
  it("starts easy with fewer colours", () => {
    expect(makeLevel(1).colors).toBe(4);
    expect(makeLevel(50).colors).toBe(6);
    expect(makeLevel(1).objective.kind).toBe("score");
  });
  it("cycles through objective kinds", () => {
    const kinds = new Set([3, 4, 5, 6, 7, 8].map((n) => makeLevel(n).objective.kind));
    expect(kinds).toEqual(new Set(["score", "collect", "jelly"]));
  });
  it("never gives fewer than 15 moves and star thresholds rise", () => {
    for (let n = 1; n <= 300; n += 7) {
      const lv = makeLevel(n);
      expect(lv.moves).toBeGreaterThanOrEqual(15);
      expect(lv.stars[0]).toBeLessThan(lv.stars[1]);
      expect(lv.stars[1]).toBeLessThan(lv.stars[2]);
    }
  });
  it("jelly levels count their jelly cells", () => {
    const lv = [3, 4, 5, 6, 7].map((n) => makeLevel(n)).find((l) => l.objective.kind === "jelly")!;
    const cells = lv.jelly.flat().filter((x) => x > 0).length;
    expect(lv.objective).toEqual({ kind: "jelly", count: cells });
  });
});

describe("daily", () => {
  it("formats a local date key", () => {
    expect(dailyKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("gives the same level all day and a different one tomorrow", () => {
    const a = makeDailyLevel(new Date(2026, 9, 10, 8));
    const b = makeDailyLevel(new Date(2026, 9, 10, 22));
    const c = makeDailyLevel(new Date(2026, 9, 11, 8));
    expect(a).toEqual(b);
    expect(a.seed).not.toBe(c.seed);
    expect(a.number).toBe(0);
  });
});

describe("session", () => {
  it("starts in a playable state", () => {
    const s = startSession(makeLevel(1));
    expect(s.status).toBe("playing");
    expect(s.movesLeft).toBe(s.level.moves);
    expect(findHint(s.grid)).not.toBeNull();
  });
  it("a valid swap uses a move and scores", () => {
    const s = startSession(makeLevel(1));
    const [a, b] = findHint(s.grid)!;
    const res = swap(s, a, b);
    expect(res.valid).toBe(true);
    expect(s.movesLeft).toBe(s.level.moves - 1);
    expect(s.score).toBeGreaterThan(0);
  });
  it("an invalid swap costs nothing", () => {
    const s = startSession(makeLevel(1));
    const before = s.movesLeft;
    swap(s, { r: 0, c: 0 }, { r: 5, c: 5 });
    expect(s.movesLeft).toBe(before);
  });
  it("can be played to the end by always taking the hint", () => {
    for (const n of [1, 3, 4, 5]) {
      const s = startSession(makeLevel(n));
      let guard = 0;
      while (s.status === "playing" && guard++ < 100) {
        const h = findHint(s.grid)!;
        expect(h).not.toBeNull();
        swap(s, h[0], h[1]);
      }
      expect(["won", "lost"]).toContain(s.status);
    }
  });
  it("loses when moves run out, and +5 moves revives", () => {
    const s = startSession(makeLevel(9));
    s.movesLeft = 1;
    const [a, b] = findHint(s.grid)!;
    swap(s, a, b);
    if (s.status === "lost") {
      expect(useBooster(s, "moves").valid).toBe(true);
      expect(s.status).toBe("playing");
      expect(s.movesLeft).toBe(5);
    }
  });
  it("hammer clears a gem without using a move", () => {
    const s = startSession(makeLevel(2));
    const before = s.movesLeft;
    expect(useBooster(s, "hammer", { r: 4, c: 4 }).valid).toBe(true);
    expect(s.movesLeft).toBe(before);
    expect(useBooster(s, "hammer").valid).toBe(false);
  });
  it("tracks objective progress and stars", () => {
    const s = startSession(makeLevel(1));
    expect(objectiveProgress(s)).toBe(0);
    s.score = s.level.stars[1];
    expect(starsFor(s.level, s.score)).toBe(2);
    expect(objectiveProgress(s)).toBe(1);
  });
  it("rewards coins for stars and spare moves", () => {
    expect(coinReward(3, 4)).toBe(38);
  });
});

describe("progress", () => {
  it("unlocks the next level and keeps best results", () => {
    let p = recordWin(newProgress(), 1, 2, 5000, 20);
    p = recordWin(p, 1, 1, 3000, 10);
    expect(p.unlocked).toBe(2);
    expect(p.stars[1]).toBe(2);
    expect(p.best[1]).toBe(5000);
    expect(p.coins).toBe(80);
  });
  it("counts a daily streak only on consecutive days", () => {
    let p = recordDaily(newProgress(), "2026-10-09", 10);
    p = recordDaily(p, "2026-10-10", 10);
    expect(p.daily.streak).toBe(2);
    expect(recordDaily(p, "2026-10-10", 10)).toBe(p);
    p = recordDaily(p, "2026-10-13", 10);
    expect(p.daily.streak).toBe(1);
    expect(p.daily.best).toBe(2);
  });
  it("handles month boundaries in streaks", () => {
    let p = recordDaily(newProgress(), "2026-09-30", 0);
    p = recordDaily(p, "2026-10-01", 0);
    expect(p.daily.streak).toBe(2);
    expect(liveStreak(p, "2026-10-02")).toBe(2);
    expect(liveStreak(p, "2026-10-03")).toBe(0);
  });
  it("buys and spends boosters", () => {
    const p = buyBooster(newProgress(), "shuffle")!;
    expect(p.coins).toBe(30);
    expect(p.boosters.shuffle).toBe(3);
    expect(buyBooster({ ...p, coins: 0 }, "hammer")).toBeNull();
    expect(spendBooster({ ...p, boosters: { ...p.boosters, moves: 0 } }, "moves")).toBeNull();
  });
  it("saves and loads, and survives bad data", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const p = recordWin(newProgress(), 1, 3, 9000, 30);
    saveProgress(storage, p);
    expect(loadProgress(storage)).toEqual(p);
    store.set("prism-pop-progress-v1", "{bad json");
    expect(loadProgress(storage)).toEqual(newProgress());
    expect(loadProgress(undefined)).toEqual(newProgress());
  });
});
