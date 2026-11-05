import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sheet } from "./Kit";

describe("Sheet", () => {
  it("names the dialog after its title so screen readers announce it", () => {
    render(<Sheet title="Let's play">body</Sheet>);
    expect(screen.getByRole("dialog", { name: "Let's play" })).toBeTruthy();
  });

  it("prefers an explicit labelledBy", () => {
    render(
      <Sheet title="Ribbon" labelledBy="own">
        <h2 id="own">Own heading</h2>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Own heading" })).toBeTruthy();
  });
});
