import { mergeProgress, newProgress, recordDaily, recordWin, type Progress } from "./game/progress";
import { newSyncCode, parseSyncCode } from "./sync";
import { syncOnce, type SyncTransport } from "./useProgressSync";

/** In-memory stand-in for the sync server, with optimistic versions like the real one. */
function fakeServer() {
  let doc: { version: number; value: unknown } | null = null;
  let pushes = 0;
  const client: SyncTransport = {
    pull: async <T,>() => (doc ? { version: doc.version, value: structuredClone(doc.value) as T } : null),
    push: async (value, baseVersion) => {
      const v = doc?.version ?? 0;
      if (baseVersion !== v) return { ok: false, conflict: true, version: v };
      pushes++;
      doc = { version: v + 1, value: structuredClone(value) };
      return { ok: true, version: v + 1 };
    },
  };
  return { client, pushes: () => pushes, doc: () => doc };
}

describe("mergeProgress", () => {
  it("keeps the best of both devices for levels, stars and scores", () => {
    const phone = recordWin(recordWin(newProgress(), 1, 3, 9000, 30, 100), 2, 1, 4000, 10, 200);
    const laptop = recordWin(newProgress(), 1, 2, 9500, 20, 150);
    const m = mergeProgress(phone, laptop);
    expect(m.unlocked).toBe(3);
    expect(m.stars).toEqual({ 1: 3, 2: 1 });
    expect(m.best).toEqual({ 1: 9500, 2: 4000 });
  });
  it("takes coins and boosters from the most recently changed device", () => {
    const a: Progress = { ...newProgress(), coins: 500, updatedAt: 10 };
    const b: Progress = { ...newProgress(), coins: 80, boosters: { hammer: 9, shuffle: 0, moves: 0 }, updatedAt: 20 };
    expect(mergeProgress(a, b).coins).toBe(80);
    expect(mergeProgress(a, b).boosters.hammer).toBe(9);
    expect(mergeProgress(b, a).coins).toBe(80);
  });
  it("keeps the most recent daily streak and the best ever", () => {
    let a = recordDaily(newProgress(), "2026-10-09", 0, 1);
    a = recordDaily(a, "2026-10-10", 0, 2);
    const b = { ...recordDaily(newProgress(), "2026-10-11", 0, 3) };
    const m = mergeProgress(a, b);
    expect(m.daily.lastDone).toBe("2026-10-11");
    expect(m.daily.streak).toBe(1);
    expect(m.daily.best).toBe(2);
  });
  it("is stable: merging with itself changes nothing", () => {
    const p = recordWin(newProgress(), 1, 2, 5000, 10, 5);
    expect(mergeProgress(p, p)).toEqual(p);
  });
  it("treats old saves without updatedAt as oldest", () => {
    const old = { ...newProgress(), coins: 999 } as Progress;
    delete (old as Partial<Progress>).updatedAt;
    const fresh = { ...newProgress(), coins: 5, updatedAt: 1 };
    expect(mergeProgress(old, fresh).coins).toBe(5);
  });
});

describe("syncOnce", () => {
  it("uploads on first sync and does not re-upload unchanged data", async () => {
    const s = fakeServer();
    const p = recordWin(newProgress(), 1, 3, 9000, 30, 100);
    expect((await syncOnce(s.client, p)).pushed).toBe(true);
    const again = await syncOnce(s.client, p);
    expect(again.pushed).toBe(false);
    expect(again.changedLocal).toBe(false);
    expect(s.pushes()).toBe(1);
  });
  it("brings a second device up to date without losing its own progress", async () => {
    const s = fakeServer();
    await syncOnce(s.client, recordWin(newProgress(), 1, 3, 9000, 30, 100));
    const other = recordWin(newProgress(), 5, 1, 100, 0, 50);
    const res = await syncOnce(s.client, other);
    expect(res.changedLocal).toBe(true);
    expect(res.merged.unlocked).toBe(6);
    expect(res.merged.stars[1]).toBe(3);
    expect(res.pushed).toBe(true);
    expect((s.doc()!.value as Progress).stars[5]).toBe(1);
  });
  it("recovers from a conflict by merging and retrying", async () => {
    const s = fakeServer();
    await syncOnce(s.client, recordWin(newProgress(), 1, 1, 100, 0, 1));
    let first = true;
    const racing: SyncTransport = {
      pull: s.client.pull,
      push: async (v, base) => {
        if (first) {
          first = false;
          await s.client.push(recordWin(newProgress(), 7, 2, 50, 0, 2), base); // another device wins the race
        }
        return s.client.push(v, base);
      },
    };
    const res = await syncOnce(racing, recordWin(newProgress(), 3, 3, 3000, 0, 3));
    expect(res.pushed).toBe(true);
    const final = s.doc()!.value as Progress;
    expect(final.stars[7]).toBe(2);
    expect(final.stars[3]).toBe(3);
  });
  it("surfaces server errors", async () => {
    const broken: SyncTransport = {
      pull: async () => null,
      push: async () => ({ ok: false, conflict: false, error: "Too many writes." }),
    };
    await expect(syncOnce(broken, newProgress())).rejects.toThrow("Too many writes.");
  });
});

describe("sync codes", () => {
  it("creates valid codes that the paste field accepts", () => {
    const code = newSyncCode();
    expect(parseSyncCode(code)).not.toBeNull();
    expect(parseSyncCode(`  ${code}  `)).not.toBeNull();
    expect(parseSyncCode("SS1-short")).toBeNull();
  });
});
