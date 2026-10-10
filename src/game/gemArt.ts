import type { Special } from "./types";

/** Gem colours (base, light, dark). Each colour also has its own shape, so colour-blind players can tell them apart. */
export const GEM_COLORS: [string, string, string][] = [
  ["#FF4D6D", "#FFB3C1", "#A4133C"], // ruby: rounded square
  ["#FFB703", "#FFE7A3", "#B86E00"], // amber: orb
  ["#2DD881", "#B5F5D3", "#0B7A45"], // emerald: diamond
  ["#3A86FF", "#B9D4FF", "#1849A9"], // sapphire: hexagon
  ["#B15CFF", "#E4C6FF", "#6A1FB0"], // amethyst: triangle
  ["#00D1FF", "#B3F1FF", "#00799A"], // topaz: star
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
  switch (color) {
    case 0: {
      const s = r * 0.86;
      ctx.beginPath();
      ctx.roundRect(-s, -s, s * 2, s * 2, r * 0.32);
      return;
    }
    case 1:
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      return;
    case 2:
      polygon(ctx, 4, r * 1.02, -Math.PI / 2);
      return;
    case 3:
      polygon(ctx, 6, r * 0.96, 0);
      return;
    case 4:
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.98);
      ctx.lineTo(r * 0.98, r * 0.78);
      ctx.lineTo(-r * 0.98, r * 0.78);
      ctx.closePath();
      return;
    default: {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r : r * 0.5;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
    }
  }
}

/** Draws one gem centred at (0,0) with radius r. */
export function drawGem(ctx: CanvasRenderingContext2D, color: number, special: Special, r: number): void {
  if (special === "prism") {
    drawPrism(ctx, r);
    return;
  }
  const [base, light, dark] = GEM_COLORS[color % GEM_COLORS.length];
  ctx.save();
  // soft drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = r * 0.35;
  ctx.shadowOffsetY = r * 0.12;
  shapePath(ctx, color, r);
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.2);
  grad.addColorStop(0, light);
  grad.addColorStop(0.45, base);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.strokeStyle = dark;
  ctx.stroke();
  // inner facet
  ctx.save();
  ctx.scale(0.55, 0.55);
  shapePath(ctx, color, r);
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();
  // gloss
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.42, r * 0.38, r * 0.17, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.38, r * 0.3, r * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
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
