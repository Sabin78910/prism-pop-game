import { newProgress } from "./progress";
import { earnedTrophies, TROPHY_IDS } from "./trophies";

describe("trophies", () => {
  it("starts with none earned", () => {
    const e = earnedTrophies(newProgress());
    expect(TROPHY_IDS.filter((id) => e[id])).toEqual([]);
  });
  it("earns from stars, levels, streaks and coins", () => {
    const p = newProgress();
    p.stars = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, i === 0 ? 3 : 2]));
    p.daily = { lastDone: "2026-10-18", streak: 3, best: 7 };
    p.coins = 500;
    const e = earnedTrophies(p);
    expect(e).toMatchObject({ firstWin: true, perfect: true, tenLevels: true, fiftyStars: false, firstDaily: true, streak3: true, streak7: true, rich: true });
  });
  it("counts stars toward fifty", () => {
    const p = newProgress();
    p.stars = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, 3]));
    expect(earnedTrophies(p).fiftyStars).toBe(true);
  });
});
