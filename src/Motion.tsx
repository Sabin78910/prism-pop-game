import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { COIN_FLIGHT_MS, COIN_STAGGER_MS, coinFlightCount, countUpAt, countUpDuration } from "./game/countUp";
import { num, type Lang } from "./i18n";

/**
 * A number that counts up to its value instead of jumping. Starts at `from` (default: the value itself) and
 * re-counts from what is on screen whenever the value changes. With reduced motion it simply shows the value.
 */
export function CountUp({ value, lang, from, delay = 0, reduce }: { value: number; lang: Lang; from?: number; delay?: number; reduce: boolean }) {
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(from ?? value);
  useEffect(() => {
    if (reduce) return;
    const start = shownRef.current;
    if (start === value) return;
    const duration = countUpDuration(value - start);
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const v = countUpAt(start, value, now - t0, duration);
      shownRef.current = v;
      setShown(v);
      if (v !== value) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delay, reduce]);
  return <>{num(lang, reduce ? value : shown)}</>;
}

type Flight = { id: number; x: number; y: number; dx: number; dy: number; n: number };

/**
 * Coins that fly from a reward to the wallet marked `data-coin-target` (the last one in the page wins, so a
 * sheet's wallet beats the one behind it). Returns the layer to render and a `fly(fromElement, coins)` trigger.
 */
export function useCoinFlight(reduce: boolean) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);
  const fly = useCallback(
    (from: Element | null, coins: number) => {
      const n = coinFlightCount(coins);
      const targets = document.querySelectorAll("[data-coin-target]");
      const to = targets[targets.length - 1];
      if (reduce || n === 0 || !from || !to) return;
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const x = a.left + a.width / 2;
      const y = a.top + a.height / 2;
      const id = nextId.current++;
      setFlights((f) => [...f, { id, x, y, dx: b.left + 18 - x, dy: b.top + b.height / 2 - y, n }]);
      setTimeout(() => setFlights((f) => f.filter((g) => g.id !== id)), COIN_FLIGHT_MS + n * COIN_STAGGER_MS + 100);
    },
    [reduce],
  );
  const layer = (
    <div className="coin-flight" aria-hidden="true">
      {flights.flatMap((f) =>
        Array.from({ length: f.n }, (_, i) => (
          <span
            key={`${f.id}-${i}`}
            className="coin coin--fly"
            style={
              {
                left: f.x + ((i * 37) % 31) - 15,
                top: f.y + ((i * 23) % 21) - 10,
                "--dx": `${f.dx}px`,
                "--dy": `${f.dy}px`,
                animationDelay: `${i * COIN_STAGGER_MS}ms`,
                animationDuration: `${COIN_FLIGHT_MS}ms`,
              } as CSSProperties
            }
          />
        )),
      )}
    </div>
  );
  return { fly, layer };
}
