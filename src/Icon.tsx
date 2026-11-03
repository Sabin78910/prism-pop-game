/**
 * Prism Pop's own icon set: simple strokes on a 24px grid, drawn for this game. Replaces emoji, which render
 * differently on every phone and made the UI look generic.
 */
export type IconName = "hammer" | "shuffle" | "plus" | "flame" | "map" | "gear" | "lock" | "trophy" | "back" | "check" | "sparkle" | "home" | "play" | "target";

const PATHS: Record<IconName, string> = {
  hammer: "M13 3l8 8-3 3-8-8zM12.5 7.5L3 17l3 3 9.5-9.5",
  shuffle: "M3 7h4l10 10h4M17 14l4 3-4 3M3 17h4l3-3M14 10l3-3h4M17 4l4 3-4 3",
  plus: "M12 5v14M5 12h14",
  flame: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-6 1-9z",
  map: "M9 4l6 3 5-2v14l-5 2-6-3-5 2V5zM9 4v14M15 7v14",
  gear: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 2 5 4 5M16 6h4c0 3-2 5-4 5M12 13v4M8 20h8M10 17h4",
  back: "M15 5l-7 7 7 7",
  check: "M5 12.5l4.5 4.5L19 7",
  sparkle: "M12 3l2 6 6 3-6 3-2 6-2-6-6-3 6-3z",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-6h4v6",
  play: "M8 5l11 7-11 7z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
};

export function Icon({ name, size = 22, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
