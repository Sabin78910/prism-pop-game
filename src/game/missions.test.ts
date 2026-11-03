import { claimMission, freshMissions, loadMissions, missionDone, missionProgress, recordFinish } from "./missions";

const day = "2026-10-18";

describe("missions", () => {
  it("counts wins, big combos and the daily, ignoring losses", () => {
    let m = freshMissions(day);
    m = recordFinish(m, day, { won: false, daily: false, bestCombo: 5 });
    expect(m.wins).toBe(0);
    m = recordFinish(m, day, { won: true, daily: false, bestCombo: 1 });
    m = recordFinish(m, day, { won: true, daily: true, bestCombo: 2 });
    expect(m).toMatchObject({ wins: 2, bigCombos: 1, daily: 1 });
    expect(missionDone(m, "win3")).toBe(false);
    expect(missionDone(m, "combo3")).toBe(true);
    expect(missionProgress(recordFinish(recordFinish(m, day, { won: true, daily: false, bestCombo: 0 }), day, { won: true, daily: false, bestCombo: 0 }), "win3")).toBe(3);
  });
  it("starts fresh on a new day", () => {
    const m = recordFinish(freshMissions(day), day, { won: true, daily: false, bestCombo: 0 });
    expect(recordFinish(m, "2026-10-19", { won: true, daily: false, bestCombo: 0 }).wins).toBe(1);
    expect(recordFinish(m, "2026-10-19", { won: false, daily: false, bestCombo: 0 }).wins).toBe(0);
  });
  it("pays each mission once and only when done", () => {
    let m = freshMissions(day);
    expect(claimMission(m, "daily").coins).toBe(0);
    m = recordFinish(m, day, { won: true, daily: true, bestCombo: 0 });
    const first = claimMission(m, "daily");
    expect(first.coins).toBe(30);
    expect(claimMission(first.missions, "daily").coins).toBe(0);
  });
  it("survives corrupt or old storage", () => {
    expect(loadMissions({ getItem: () => "{nope" }, day)).toEqual(freshMissions(day));
    expect(loadMissions({ getItem: () => JSON.stringify({ day: "2026-10-01", wins: 3 }) }, day)).toEqual(freshMissions(day));
    expect(loadMissions({ getItem: () => JSON.stringify({ day, wins: 2 }) }, day).wins).toBe(2);
  });
});
