import type { Special } from "./types";

/** Gem colours (base, light, dark). Each colour also has its own shape, so colour-blind players can tell them apart. */
export const GEM_COLORS: [string, string, string][] = [
  ["#FF2E4D", "#FFB3BF", "#A3001C"], // ruby: heart
  ["#FFC800", "#FFF1A6", "#C77A00"], // amber: round drop
  ["#2ED84A", "#C2F7B8", "#0B7A24"], // emerald: diamond
  ["#1E7BFF", "#B5D6FF", "#0B3FAE"], // sapphire: hexagon
  ["#B23DFF", "#E7C2FF", "#6510A8"], // amethyst: berry cluster
  ["#FF7A1A", "#FFD2A8", "#B23F00"], // topaz: teardrop
];

export const GEM_NAMES_EN = ["Ruby", "Amber", "Emerald", "Sapphire", "Amethyst", "Topaz"];
export const GEM_NAMES_NE = ["माणिक", "अम्बर", "पन्ना", "नीलम", "जामुनी", "पुखराज"];

function polygon(ctx: CanvasRenderingContext2D, n: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function shapePath(ctx: CanvasRenderingContext2D, color: number, r: number): void {
  ctx.beginPath();
  switch (color) {
    case 0: // heart
      ctx.moveTo(0, r * 0.96);
      ctx.bezierCurveTo(-r * 1.3, r * 0.1, -r * 0.9, -r * 1.12, 0, -r * 0.52);
      ctx.bezierCurveTo(r * 0.9, -r * 1.12, r * 1.3, r * 0.1, 0, r * 0.96);
      ctx.closePath();
      return;
    case 1: // round drop
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      return;
    case 2:
      polygon(ctx, 4, r * 1.02, -Math.PI / 2);
      return;
    case 3:
      polygon(ctx, 6, r * 0.96, 0);
      return;
    case 4: // berry cluster: six berries round a centre one
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        ctx.moveTo(Math.cos(a) * r * 0.52 + r * 0.4, Math.sin(a) * r * 0.52);
        ctx.arc(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52, r * 0.4, 0, Math.PI * 2);
      }
      ctx.moveTo(r * 0.42, 0);
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      return;
    default: // teardrop
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.78, -r * 0.2, r * 0.78, r * 0.2);
      ctx.arc(0, r * 0.2, r * 0.78, 0, Math.PI);
      ctx.quadraticCurveTo(-r * 0.78, -r * 0.2, 0, -r);
      ctx.closePath();
  }
}

/** Outline points used to cut facets; the circle uses a 12-gon under a round clip. */
function facetPoints(color: number, r: number): [number, number][] {
  const ring = (n: number, rad: number, rot: number) =>
    Array.from({ length: n }, (_, i): [number, number] => [Math.cos(rot + (i * 2 * Math.PI) / n) * rad, Math.sin(rot + (i * 2 * Math.PI) / n) * rad]);
  switch (color) {
    case 0: {
      const s = r * 0.86;
      const c = r * 0.3;
      return [[-s + c, -s], [s - c, -s], [s, -s + c], [s, s - c], [s - c, s], [-s + c, s], [-s, s - c], [-s, -s + c]];
    }
    case 1:
      return ring(12, r * 0.92, -Math.PI / 2);
    case 2:
      return ring(4, r * 1.02, -Math.PI / 2);
    case 3:
      return ring(6, r * 0.96, 0);
    case 4:
      return [[0, -r * 0.98], [r * 0.98, r * 0.78], [-r * 0.98, r * 0.78]];
    default:
      return Array.from({ length: 10 }, (_, i): [number, number] => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.5;
        return [Math.cos(a) * rad, Math.sin(a) * rad];
      });
  }
}

function pathOf(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Four-point sparkle. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/**
 * Draws one gem centred at (0,0) with radius r: a cut jewel with light facets towards the top left, dark
 * facets away from it, a bright table, a candy-gloss highlight and a sparkle. Silhouettes never change, so
 * each colour keeps its own shape for colour-blind players.
 */
export function drawGem(ctx: CanvasRenderingContext2D, color: number, special: Special, r: number): void {
  if (special === "prism") {
    drawPrism(ctx, r);
    return;
  }
  const [base, light, dark] = GEM_COLORS[color % GEM_COLORS.length];
  ctx.save();
  // body with a soft drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = r * 0.3;
  ctx.shadowOffsetY = r * 0.14;
  shapePath(ctx, color, r);
  const body = ctx.createLinearGradient(-r * 0.6, -r, r * 0.6, r);
  body.addColorStop(0, light);
  body.addColorStop(0.35, base);
  body.addColorStop(1, dark);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.save();
  shapePath(ctx, color, r);
  ctx.clip();
  // facets: each outer edge to the matching edge of the inner table, lit by its angle to the light
  const cut = color === 2 || color === 3;
  const outer = cut ? facetPoints(color, r) : [];
  const inner = outer.map(([x, y]): [number, number] => [x * 0.52, y * 0.52 - r * 0.05]);
  const lx = -0.6, ly = -0.8;
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    const mx = (outer[i][0] + outer[j][0]) / 2, my = (outer[i][1] + outer[j][1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const facing = (mx / len) * lx + (my / len) * ly;
    pathOf(ctx, [outer[i], outer[j], inner[j], inner[i]]);
    ctx.fillStyle = facing > 0 ? `rgba(255,255,255,${0.08 + facing * 0.32})` : `rgba(0,0,0,${-facing * 0.28})`;
    ctx.fill();
  }
  // table (cut gems) or a soft inner glow (candies)
  if (cut) pathOf(ctx, inner);
  else {
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.12, r * 0.55, 0, Math.PI * 2);
  }
  const table = ctx.createRadialGradient(-r * 0.15, -r * 0.25, 0, 0, 0, r * 0.6);
  table.addColorStop(0, "rgba(255,255,255,0.75)");
  table.addColorStop(0.5, light);
  table.addColorStop(1, base);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = table;
  ctx.fill();
  ctx.globalAlpha = 1;
  // reflected light along the bottom
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.75, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fill();
  // candy gloss across the top
  const gloss = ctx.createLinearGradient(0, -r, 0, -r * 0.15);
  gloss.addColorStop(0, "rgba(255,255,255,0.7)");
  gloss.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.ellipse(-r * 0.12, -r * 0.55, r * 0.62, r * 0.36, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();
  ctx.restore();

  // crisp rim (the berry cluster skips it so the inner berries stay clean)
  shapePath(ctx, color, r);
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.strokeStyle = dark;
  if (color !== 4) ctx.stroke();
  // sparkle
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  sparkle(ctx, -r * 0.36, -r * 0.36, r * 0.16);
  ctx.beginPath();
  ctx.arc(r * 0.34, r * 0.26, r * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fill();

  if (special === "lineH" || special === "lineV") {
    ctx.save();
    shapePath(ctx, color, r);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const w = r * 0.18;
    for (const off of [-r * 0.32, r * 0.32]) {
      if (special === "lineH") ctx.fillRect(-r, off - w / 2, r * 2, w);
      else ctx.fillRect(off - w / 2, -r, w, r * 2);
    }
    ctx.restore();
  } else if (special === "bomb") {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const rad = i % 2 === 0 ? r * 0.5 : r * 0.22;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.lineWidth = r * 0.12;
    ctx.strokeStyle = "rgba(255,209,102,0.95)";
    shapePath(ctx, color, r * 1.02);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPrism(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = r * 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  const conic = ctx.createConicGradient(0, 0, 0);
  ["#FF4D6D", "#FFB703", "#2DD881", "#00D1FF", "#3A86FF", "#B15CFF", "#FF4D6D"].forEach((c, i, arr) =>
    conic.addColorStop(i / (arr.length - 1), c),
  );
  ctx.fillStyle = conic;
  ctx.fill();
  ctx.shadowColor = "transparent";
  const glow = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r * 0.9);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.35, "rgba(255,255,255,0.25)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();
  ctx.restore();
}

const cache = new Map<string, HTMLCanvasElement>();

/** Pre-renders a gem sprite (sizes in device pixels) so each frame only blits images. */
export function gemSprite(color: number, special: Special, size: number): HTMLCanvasElement {
  const k = `${color}|${special}|${size}`;
  let c = cache.get(k);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.translate(size / 2, size / 2);
      drawGem(ctx, color, special, size * 0.4);
    }
    cache.set(k, c);
  }
  return c;
}

export function clearSpriteCache(): void {
  cache.clear();
}
