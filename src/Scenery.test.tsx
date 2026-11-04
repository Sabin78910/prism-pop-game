import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Scenery, WORLD_ART } from "./Scenery";
import { WORLD_IDS } from "./game/worlds";

describe("Scenery", () => {
  it("paints the Canva backdrop for worlds that have one", () => {
    const { container } = render(<Scenery world="caves" />);
    const el = container.querySelector(".scenery--art") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.backgroundImage).toContain(WORLD_ART.caves);
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("falls back to the drawn sky for worlds without art", () => {
    const { container } = render(<Scenery world="forge" />);
    expect(container.querySelector("svg.scenery")).not.toBeNull();
    expect(container.querySelector(".scenery--art")).toBeNull();
  });

  it("only maps real worlds", () => {
    for (const id of Object.keys(WORLD_ART)) expect(WORLD_IDS).toContain(id);
  });
});
