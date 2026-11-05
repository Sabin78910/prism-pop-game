import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Scenery } from "./Scenery";
import { WORLD_IDS, WORLD_THEME } from "./game/worlds";

describe("Scenery", () => {
  it("lights every world with its own accent, without images", () => {
    for (const world of WORLD_IDS) {
      const { container, unmount } = render(<Scenery world={world} />);
      const el = container.querySelector(".scenery") as HTMLElement;
      expect(el.getAttribute("aria-hidden")).toBe("true");
      expect(el.style.getPropertyValue("--accent")).toBe(WORLD_THEME[world].accent);
      expect(container.querySelector("img, svg")).toBeNull();
      unmount();
    }
  });
});
