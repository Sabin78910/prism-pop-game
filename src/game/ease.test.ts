import { describe, expect, it } from "vitest";
import { findHint } from "./board";
import { EASY_CUSHION, makeLevel } from "./level";
import { startSession, swap } from "./session";

/** Plays the first legal move it finds, with no boosters: much weaker than a person. */
function naivePlay(n: number): boolean {
  const s = startSession(makeLevel(n));
  for (let i = 0; s.status === "playing" && i < 200; i++) {
    const h = findHint(s.grid);
    if (!h) break;
    swap(s, h[0], h[1]);
  }
  return s.status === "won";
}

describe("relaxed levels", () => {
  it("gives every level a cushion of spare moves", () => {
    expect(EASY_CUSHION).toBeGreaterThanOrEqual(6);
    for (let n = 1; n <= 90; n++) expect(makeLevel(n).moves).toBeGreaterThanOrEqual(15 + EASY_CUSHION);
  });

  it("lets even a naive player clear the whole first world", () => {
    for (let n = 1; n <= 15; n++) expect(naivePlay(n), `level ${n}`).toBe(true);
  });
});
