import { memo } from "react";
import { createRng } from "./game/rng";
import { WORLD_THEME, type WorldId } from "./game/worlds";

/**
 * A full-screen scene behind every screen: night sky, stars and a world-specific skyline, all generated as
 * SVG here (no image files, nothing licensed from anyone). Fixed behind the UI, decorative only.
 */
const SKYLINE: Record<WorldId, { far: string; near: string }> = {
  caves: {
    far: "M0 300 L40 210 L70 260 L110 150 L150 250 L190 190 L230 270 L280 140 L330 240 L370 180 L400 230 L400 400 L0 400Z",
    near: "M0 340 L30 290 L55 330 L95 250 L130 320 L170 280 L210 330 L250 260 L300 330 L345 270 L400 320 L400 400 L0 400Z",
  },
  garden: {
    far: "M0 280 Q50 200 100 260 Q150 180 210 250 Q270 190 330 250 Q370 210 400 240 L400 400 L0 400Z",
    near: "M0 330 Q40 290 80 320 Q130 270 180 320 Q230 280 280 320 Q330 285 400 315 L400 400 L0 400Z",
  },
  frost: {
    far: "M0 290 L70 170 L110 220 L170 120 L240 230 L290 170 L350 240 L400 200 L400 400 L0 400Z",
    near: "M0 330 L60 260 L120 320 L190 250 L250 320 L320 270 L400 320 L400 400 L0 400Z",
  },
  forge: {
    far: "M0 300 L60 250 L120 270 L170 160 L200 150 L230 165 L280 260 L340 240 L400 270 L400 400 L0 400Z",
    near: "M0 340 L50 300 L110 330 L160 290 L220 335 L290 300 L350 330 L400 310 L400 400 L0 400Z",
  },
  spire: {
    far: "M0 300 L80 260 L150 280 L190 90 L200 40 L210 90 L250 280 L320 250 L400 285 L400 400 L0 400Z",
    near: "M0 340 L70 310 L140 335 L200 300 L260 335 L330 305 L400 330 L400 400 L0 400Z",
  },
};

export const Scenery = memo(function Scenery({ world }: { world: WorldId }) {
  const { accent, deep } = WORLD_THEME[world];
  const rng = createRng(7);
  const stars = Array.from({ length: 46 }, () => ({ x: rng() * 400, y: rng() * 230, r: 0.4 + rng() * 1.3, o: 0.3 + rng() * 0.7 }));
  const sky = SKYLINE[world];
  return (
    <svg className="scenery" viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0520" />
          <stop offset="0.6" stopColor={deep} />
          <stop offset="1" stopColor={accent} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.35" stopColor={accent} stopOpacity="0.35" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#sky)" />
      {world === "spire" && (
        <path className="scenery__aurora" d="M-20 120 Q100 40 200 110 T420 90" stroke={accent} strokeWidth="26" fill="none" opacity="0.25" />
      )}
      <circle cx="318" cy="70" r="70" fill="url(#moon)" />
      {stars.map((s, i) => (
        <circle key={i} className={i % 5 === 0 ? "scenery__twinkle" : undefined} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
      ))}
      <path d={sky.far} fill={accent} opacity="0.28" />
      <path d={sky.near} fill="#0B0520" opacity="0.85" />
    </svg>
  );
});
