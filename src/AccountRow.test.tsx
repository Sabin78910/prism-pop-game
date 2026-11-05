import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountRow } from "./AccountRow";

describe("AccountRow", () => {
  it("shows nothing when no Google client ID is built in", () => {
    const { container } = render(<AccountRow lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
