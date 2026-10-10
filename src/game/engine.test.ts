import { createGrid, findHint, findMatches, isValidSwap, shuffleGrid, specialFor } from "./board";
import { blastArea, playMove, smash, type ResolveContext } from "./resolve";
import { createRng, hashString } from "./rng";
import type { Grid, Special } from "./types";

/** Builds a grid from rows of digits (colour) with '.' for empty. */
function g(rows: string[]): Grid {
  let id = 1000;
  return rows.map((row) => [...row].map((ch) => (ch === "." ? null : { id: id++, color: Number(ch), special: "none" as Special })));
}

function setSpecial(grid: Grid, r: number, c: number, special: Special, color?: number): void {
  const gem = grid[r][c]!;
  grid[r][c] = { ...gem, special, color: color ?? (special === "prism" ? -1 : gem.color) };
}

function ctx(colors = 4, rows = 5, cols = 5, seed = 1): ResolveContext {
  return {
    rng: createRng(seed),
    colors,
    jelly: Array.from({ length: rows }, () => Array(cols).fill(0)),
    nextId: 1,
  };
}

const colorsLeft = (grid: Grid) => grid.flat().every((x) => x !== null);

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("stays in [0,1)", () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("hashes strings stably", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

describe("findMatches", () => {
  it("finds a horizontal three", () => {
    const m = findMatches(g(["000", "123", "231"]));
    expect(m).toHaveLength(1);
    expect(m[0].cells).toHaveLength(3);
    expect(m[0].hasH).toBe(true);
  });
  it("finds a vertical three", () => {
    const m = findMatches(g(["012", "013", "021"]));
    expect(m).toHaveLength(1);
    expect(m[0].hasV).toBe(true);
  });
  it("returns nothing for no matches", () => {
    expect(findMatches(g(["012", "120", "201"]))).toHaveLength(0);
  });
  it("merges an L shape into one group", () => {
    const m = findMatches(g(["0001", "0123", "0231"]));
    expect(m).toHaveLength(1);
    expect(m[0].cells).toHaveLength(5);
    expect(m[0].hasH && m[0].hasV).toBe(true);
  });
  it("ignores empty cells and prisms", () => {
    const grid = g(["0.00", "1212"]);
    expect(findMatches(grid)).toHaveLength(0);
    const p = g(["000", "121"]);
    setSpecial(p, 0, 1, "prism");
    expect(findMatches(p)).toHaveLength(0);
  });
  it("reports the longest run", () => {
    expect(findMatches(g(["00000", "12121"]))[0].longest).toBe(5);
  });
});

describe("specialFor", () => {
  it("maps shapes to specials", () => {
    expect(specialFor(findMatches(g(["000", "121"]))[0])).toBe("none");
    expect(specialFor(findMatches(g(["0000", "1212"]))[0])).toBe("lineV");
    expect(specialFor(findMatches(g(["01", "02", "01", "02"]))[0])).toBe("lineH");
    expect(specialFor(findMatches(g(["0001", "0123", "0231"]))[0])).toBe("bomb");
    expect(specialFor(findMatches(g(["00000", "12121"]))[0])).toBe("prism");
  });
});

describe("createGrid", () => {
  it("has no starting matches and has a move, across many seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const ids = { nextId: 1 };
      const grid = createGrid(9, 8, 5, createRng(seed), ids);
      expect(findMatches(grid)).toHaveLength(0);
      expect(findHint(grid)).not.toBeNull();
      expect(grid).toHaveLength(9);
      expect(grid[0]).toHaveLength(8);
    }
  });
  it("gives every gem a unique id", () => {
    const grid = createGrid(9, 8, 6, createRng(3), { nextId: 1 });
    const ids = grid.flat().map((x) => x!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("is reproducible from a seed", () => {
    const a = createGrid(9, 8, 5, createRng(11), { nextId: 1 });
    const b = createGrid(9, 8, 5, createRng(11), { nextId: 1 });
    expect(a.map((r) => r.map((x) => x!.color))).toEqual(b.map((r) => r.map((x) => x!.color)));
  });
});

describe("isValidSwap", () => {
  const grid = g(["0101", "1022", "2313"]);
  it("accepts a swap that makes a match", () => {
    expect(isValidSwap(grid, { r: 0, c: 1 }, { r: 1, c: 1 })).toBe(true);
  });
  it("rejects a swap without a match", () => {
    expect(isValidSwap(grid, { r: 2, c: 0 }, { r: 2, c: 1 })).toBe(false);
  });
  it("rejects non-adjacent and out-of-bounds swaps", () => {
    expect(isValidSwap(grid, { r: 0, c: 0 }, { r: 1, c: 1 })).toBe(false);
    expect(isValidSwap(grid, { r: 0, c: 3 }, { r: 0, c: 4 })).toBe(false);
  });
  it("always accepts a prism swap", () => {
    const p = g(["0123", "1230"]);
    setSpecial(p, 0, 0, "prism");
    expect(isValidSwap(p, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(true);
  });
  it("accepts swapping two specials", () => {
    const p = g(["0123", "1230"]);
    setSpecial(p, 0, 0, "bomb");
    setSpecial(p, 0, 1, "lineH");
    expect(isValidSwap(p, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(true);
  });
});

describe("findHint", () => {
  it("returns null when no move exists", () => {
    expect(findHint(g(["012", "120", "201"]))).toBeNull();
  });
  it("returns a valid move", () => {
    const grid = g(["0101", "1022", "2313"]);
    const hint = findHint(grid)!;
    expect(isValidSwap(grid, hint[0], hint[1])).toBe(true);
  });
});

describe("shuffleGrid", () => {
  it("keeps the same gems and leaves a playable board", () => {
    const grid = createGrid(9, 8, 5, createRng(5), { nextId: 1 });
    const next = shuffleGrid(grid, createRng(9));
    const ids = (x: Grid) => x.flat().map((gm) => gm!.id).sort((a, b) => a - b);
    expect(ids(next)).toEqual(ids(grid));
    expect(findMatches(next)).toHaveLength(0);
    expect(findHint(next)).not.toBeNull();
  });
});

describe("blastArea", () => {
  const grid = g(["01230", "12301", "23012", "30123", "01230"]);
  it("line clears a row or column", () => {
    expect(blastArea(grid, { r: 2, c: 2 }, "lineH")).toHaveLength(5);
    expect(blastArea(grid, { r: 2, c: 2 }, "lineV").every((p) => p.c === 2)).toBe(true);
  });
  it("bomb clears 3x3, clipped at edges", () => {
    expect(blastArea(grid, { r: 2, c: 2 }, "bomb")).toHaveLength(9);
    expect(blastArea(grid, { r: 0, c: 0 }, "bomb")).toHaveLength(4);
  });
  it("prism targets the commonest colour", () => {
    const area = blastArea(grid, { r: 0, c: 0 }, "prism");
    const color = grid[area[0].r][area[0].c]!.color;
    expect(area.every((p) => grid[p.r][p.c]!.color === color)).toBe(true);
    expect(area.length).toBeGreaterThan(0);
  });
});

describe("playMove", () => {
  it("rejects an invalid swap and leaves the grid alone", () => {
    const grid = g(["012", "120", "201"]);
    const res = playMove(grid, { r: 0, c: 0 }, { r: 0, c: 1 }, ctx(3, 3, 3));
    expect(res.valid).toBe(false);
    expect(res.grid).toBe(grid);
  });
  it("clears a three, refills and scores", () => {
    const grid = g(["10023", "01231", "23102", "31023", "02310"]);
    const res = playMove(grid, { r: 1, c: 0 }, { r: 0, c: 0 }, ctx());
    expect(res.valid).toBe(true);
    expect(res.steps[0].cleared.length).toBeGreaterThanOrEqual(3);
    expect(res.steps[0].score).toBeGreaterThan(0);
    expect(colorsLeft(res.grid)).toBe(true);
    expect(colorsLeft(grid)).toBe(true); // input untouched
  });
  it("creates a line special for a four, at the swapped cell", () => {
    const grid = g(["10003", "01231", "23102", "31023", "02310"]);
    const res = playMove(grid, { r: 1, c: 0 }, { r: 0, c: 0 }, ctx());
    expect(res.steps[0].created).toHaveLength(1);
    expect(res.steps[0].created[0].gem.special).toBe("lineV");
    expect(res.steps[0].created[0].pos).toEqual({ r: 0, c: 0 });
  });
  it("creates a prism for a five", () => {
    const grid = g(["00100", "12021", "21312", "13231", "32123"]);
    const res = playMove(grid, { r: 0, c: 2 }, { r: 1, c: 2 }, ctx());
    expect(res.steps[0].created.map((x) => x.gem.special)).toContain("prism");
  });
  it("prism + gem clears every gem of that colour", () => {
    const grid = g(["01212", "21010", "12121", "20202", "13131"]);
    setSpecial(grid, 0, 0, "prism");
    const ones = grid.flat().filter((x) => x?.color === 1).length;
    const res = playMove(grid, { r: 0, c: 0 }, { r: 0, c: 1 }, ctx());
    expect(res.valid).toBe(true);
    const clearedOnes = res.steps[0].cleared.filter((x) => x.gem.color === 1).length;
    expect(clearedOnes).toBe(ones);
  });
  it("prism + prism clears the whole board", () => {
    const grid = g(["01212", "21010", "12121", "20202", "13131"]);
    setSpecial(grid, 2, 2, "prism");
    setSpecial(grid, 2, 3, "prism");
    const res = playMove(grid, { r: 2, c: 2 }, { r: 2, c: 3 }, ctx());
    expect(res.steps[0].cleared).toHaveLength(25);
  });
  it("line + line clears a cross", () => {
    const grid = g(["01212", "23030", "12121", "30303", "13131"]);
    setSpecial(grid, 2, 1, "lineH");
    setSpecial(grid, 2, 2, "lineV");
    const res = playMove(grid, { r: 2, c: 1 }, { r: 2, c: 2 }, ctx());
    const cells = new Set(res.steps[0].cleared.map((x) => `${x.pos.r},${x.pos.c}`));
    for (let i = 0; i < 5; i++) {
      expect(cells.has(`2,${i}`)).toBe(true);
      expect(cells.has(`${i},2`)).toBe(true);
    }
  });
  it("bomb + bomb clears 5x5 around the target", () => {
    const grid = g(["01212", "23030", "12121", "30303", "13131"]);
    setSpecial(grid, 2, 1, "bomb");
    setSpecial(grid, 2, 2, "bomb");
    const res = playMove(grid, { r: 2, c: 1 }, { r: 2, c: 2 }, ctx());
    expect(res.steps[0].cleared).toHaveLength(25);
  });
  it("a special caught in a match sets off its blast (chain)", () => {
    const grid = g(["10023", "01231", "23102", "31023", "02310"]);
    setSpecial(grid, 0, 2, "lineV");
    const res = playMove(grid, { r: 1, c: 0 }, { r: 0, c: 0 }, ctx());
    const col2 = res.steps[0].cleared.filter((x) => x.pos.c === 2);
    expect(col2).toHaveLength(5);
    expect(res.steps[0].blasts[0].special).toBe("lineV");
  });
  it("cascades score with a growing combo multiplier", () => {
    let foundCascade = false;
    for (let seed = 1; seed < 40 && !foundCascade; seed++) {
      const c = ctx(4, 9, 8, seed);
      const grid = createGrid(9, 8, 4, c.rng, c);
      const hint = findHint(grid)!;
      const res = playMove(grid, hint[0], hint[1], c);
      if (res.steps.length > 1) {
        foundCascade = true;
        expect(res.steps[1].combo).toBe(1);
      }
      expect(findMatches(res.grid)).toHaveLength(0);
    }
    expect(foundCascade).toBe(true);
  });
  it("decrements jelly under cleared gems", () => {
    const grid = g(["10023", "01231", "23102", "31023", "02310"]);
    const c = ctx();
    c.jelly[0][1] = 2;
    playMove(grid, { r: 1, c: 0 }, { r: 0, c: 0 }, c);
    expect(c.jelly[0][1]).toBe(1);
  });
  it("records spawned gems starting above the board", () => {
    const grid = g(["10023", "01231", "23102", "31023", "02310"]);
    const res = playMove(grid, { r: 1, c: 0 }, { r: 0, c: 0 }, ctx());
    expect(res.steps[0].spawned.length).toBe(res.steps[0].cleared.length - res.steps[0].created.length);
    expect(res.steps[0].spawned.every((s) => s.startRow < 0)).toBe(true);
  });
});

describe("smash", () => {
  it("removes one gem and settles", () => {
    const grid = g(["01212", "23030", "12121", "30303", "13131"]);
    const res = smash(grid, { r: 0, c: 0 }, ctx());
    expect(res.valid).toBe(true);
    expect(res.steps[0].cleared.map((x) => x.pos)).toContainEqual({ r: 0, c: 0 });
    expect(colorsLeft(res.grid)).toBe(true);
  });
  it("fails on an empty cell", () => {
    const res = smash(g(["0.1"]), { r: 0, c: 1 }, ctx(3, 1, 3));
    expect(res.valid).toBe(false);
  });
});
