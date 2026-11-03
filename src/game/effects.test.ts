import { effectProgress, hitStopMs, stepEffects } from "./effects";

describe("board effects", () => {
  it("gives each special its own effect, centred on its cell", () => {
    const fx = stepEffects({
      blasts: [
        { pos: { r: 2, c: 3 }, special: "lineH" },
        { pos: { r: 0, c: 0 }, special: "bomb" },
        { pos: { r: 4, c: 4 }, special: "prism" },
      ],
      created: [],
    });
    expect(fx.map((f) => f.kind)).toEqual(["beamH", "ring", "rays", "ring"]);
    expect(fx[0]).toMatchObject({ r: 2.5, c: 3.5 });
  });
  it("flashes where a power gem is made", () => {
    const fx = stepEffects({ blasts: [], created: [{ pos: { r: 1, c: 1 }, gem: { id: 1, color: 0, special: "bomb" } }] });
    expect(fx).toEqual([{ kind: "flash", r: 1.5, c: 1.5, duration: 0.4 }]);
  });
  it("pauses briefly on blasts, more for chains, capped, never with reduced motion", () => {
    expect(hitStopMs(0, false)).toBe(0);
    expect(hitStopMs(1, false)).toBe(50);
    expect(hitStopMs(3, false)).toBe(110);
    expect(hitStopMs(20, false)).toBe(140);
    expect(hitStopMs(5, true)).toBe(0);
  });
  it("eases effect progress from 0 to 1", () => {
    expect(effectProgress(0, 1)).toBe(0);
    expect(effectProgress(0.5, 1)).toBeGreaterThan(0.5);
    expect(effectProgress(2, 1)).toBe(1);
  });
});
