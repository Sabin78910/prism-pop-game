import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUp, useCoinFlight } from "./Motion";

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] }));
afterEach(() => vi.useRealTimers());

describe("CountUp", () => {
  it("counts from the start value to the target and lands on it exactly", () => {
    render(
      <span data-testid="n">
        <CountUp value={1200} from={0} lang="en" reduce={false} />
      </span>,
    );
    expect(screen.getByTestId("n").textContent).toBe("0");
    act(() => vi.advanceTimersByTime(200));
    const mid = Number(screen.getByTestId("n").textContent!.replace(/,/g, ""));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1200);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId("n").textContent).toBe("1,200");
  });

  it("shows the final value at once with reduced motion", () => {
    render(
      <span data-testid="n">
        <CountUp value={50} from={0} lang="en" reduce />
      </span>,
    );
    expect(screen.getByTestId("n").textContent).toBe("50");
  });
});

function Flyer({ reduce, coins }: { reduce: boolean; coins: number }) {
  const { fly, layer } = useCoinFlight(reduce);
  return (
    <>
      <span data-coin-target>wallet</span>
      <button onClick={(e) => fly(e.currentTarget, coins)}>claim</button>
      {layer}
    </>
  );
}

describe("coin flight", () => {
  it("sends coins toward the wallet, then clears them", () => {
    const { container } = render(<Flyer reduce={false} coins={30} />);
    act(() => screen.getByText("claim").click());
    expect(container.querySelectorAll(".coin--fly").length).toBe(6);
    act(() => vi.advanceTimersByTime(3000));
    expect(container.querySelectorAll(".coin--fly").length).toBe(0);
  });

  it("sends nothing with reduced motion", () => {
    const { container } = render(<Flyer reduce coins={30} />);
    act(() => screen.getByText("claim").click());
    expect(container.querySelectorAll(".coin--fly").length).toBe(0);
  });
});
