import { describe, expect, it } from "vitest";
import { PULSE_FRAME_MS, canvasScale, shouldDraw } from "./frameGate";

describe("shouldDraw", () => {
  const still = { animating: false, pulsing: false, changed: false, sinceDraw: 1000 };
  it("skips a still board", () => expect(shouldDraw(still)).toBe(false));
  it("draws while anything moves or changes", () => {
    expect(shouldDraw({ ...still, animating: true, sinceDraw: 0 })).toBe(true);
    expect(shouldDraw({ ...still, changed: true, sinceDraw: 0 })).toBe(true);
  });
  it("throttles idle pulses", () => {
    expect(shouldDraw({ ...still, pulsing: true, sinceDraw: PULSE_FRAME_MS - 1 })).toBe(false);
    expect(shouldDraw({ ...still, pulsing: true, sinceDraw: PULSE_FRAME_MS })).toBe(true);
  });
});

describe("canvasScale", () => {
  it("caps dense screens at 2x", () => expect(canvasScale(3, 8)).toBe(2));
  it("caps low-end phones at 1.5x", () => expect(canvasScale(2.75, 4)).toBe(1.5));
  it("never goes below 1x", () => expect(canvasScale(0, undefined)).toBe(1));
  it("keeps a 1x screen at 1x", () => expect(canvasScale(1, 2)).toBe(1));
});
