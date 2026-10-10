import { useEffect, useRef } from "react";
import { findHint, isAdjacent } from "./game/board";
import { GEM_COLORS, gemSprite } from "./game/gemArt";
import { comboWord, hapticPattern } from "./game/feedback";
import type { Grid, Pos, Step } from "./game/types";
import type { TurnResult } from "./game/session";
import { sfx } from "./audio";

interface Props {
  grid: Grid;
  jelly: number[][];
  lang: "en" | "ne";
  reducedMotion: boolean;
  haptics: boolean;
  hammer: boolean;
  /** Returns the turn result; the canvas animates it. */
  onSwap: (a: Pos, b: Pos) => TurnResult;
  onHammer: (p: Pos) => TurnResult;
  onSettled: (grid: Grid) => void;
  getGrid: () => Grid;
}

interface Sprite {
  x: number;
  y: number;
  vy: number;
  scale: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}
interface FloatText {
  text: string;
  x: number;
  y: number;
  life: number;
}

const buzz = (pattern: number[]) => {
  if (pattern.length && "vibrate" in navigator) navigator.vibrate(pattern);
};

export function GameCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Mutable animation state lives in a ref; React only re-renders the HUD.
  const st = useRef({
    grid: props.grid,
    sprites: new Map<number, Sprite>(),
    particles: [] as Particle[],
    texts: [] as FloatText[],
    busy: false,
    selected: null as Pos | null,
    drag: null as { pos: Pos; x: number; y: number } | null,
    shake: 0,
    lastInput: performance.now(),
    hint: null as [Pos, Pos] | null,
    swapAnim: null as null | { a: Pos; b: Pos; t: number; back: boolean },
    cell: 40,
  });

  // Adopt a new grid from outside (new level, shuffle) when not animating.
  useEffect(() => {
    const s = st.current;
    if (!s.busy) {
      s.grid = props.grid;
      s.hint = null;
    }
  }, [props.grid]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const s = st.current;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const rows = s.grid.length;
      const cols = s.grid[0].length;
      s.cell = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const p = propsRef.current;
      const cell = s.cell;
      const rows = s.grid.length;
      const cols = s.grid[0].length;
      const ox = (canvas.width - cell * cols) / 2;
      const oy = (canvas.height - cell * rows) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (s.shake > 0 && !p.reducedMotion) {
        ctx.translate((Math.random() - 0.5) * s.shake * cell * 0.15, (Math.random() - 0.5) * s.shake * cell * 0.15);
      }
      s.shake = Math.max(0, s.shake - dt / 250);

      // board tiles + jelly
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = ox + c * cell;
          const y = oy + r * cell;
          ctx.fillStyle = (r + c) % 2 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.11)";
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.18);
          ctx.fill();
          const j = p.jelly[r]?.[c] ?? 0;
          if (j > 0) {
            ctx.fillStyle = j > 1 ? "rgba(255,92,170,0.55)" : "rgba(255,140,200,0.32)";
            ctx.beginPath();
            ctx.roundRect(x + 3, y + 3, cell - 6, cell - 6, cell * 0.2);
            ctx.fill();
          }
        }
      }

      // selection + hint glow
      const glow = (q: Pos, alpha: number) => {
        ctx.fillStyle = `rgba(255,209,102,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(ox + q.c * cell + 2, oy + q.r * cell + 2, cell - 4, cell - 4, cell * 0.2);
        ctx.fill();
      };
      if (s.selected) glow(s.selected, 0.35);
      if (!s.busy && now - s.lastInput > 5000) {
        s.hint ??= findHint(s.grid);
        if (s.hint) {
          const a = 0.18 + 0.18 * Math.sin(now / 180);
          glow(s.hint[0], a);
          glow(s.hint[1], a);
        }
      }

      // gems
      const spriteSize = Math.round(cell);
      const spring = p.reducedMotion ? 1 : Math.min(1, dt / 70);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gem = s.grid[r][c];
          if (!gem) continue;
          let sp = s.sprites.get(gem.id);
          if (!sp) {
            sp = { x: c, y: r, vy: 0, scale: 0.2 };
            s.sprites.set(gem.id, sp);
          }
          let tx = c;
          let ty = r;
          const sw = s.swapAnim;
          if (sw) {
            const k = sw.back ? Math.sin(Math.min(1, sw.t) * Math.PI) : Math.min(1, sw.t);
            if (r === sw.a.r && c === sw.a.c) {
              tx = c + (sw.b.c - sw.a.c) * k;
              ty = r + (sw.b.r - sw.a.r) * k;
            } else if (r === sw.b.r && c === sw.b.c) {
              tx = c + (sw.a.c - sw.b.c) * k;
              ty = r + (sw.a.r - sw.b.r) * k;
            }
          }
          if (sw || p.reducedMotion) {
            sp.x = tx;
            sp.y = ty;
          } else {
            sp.x += (tx - sp.x) * spring;
            if (sp.y < ty) {
              sp.vy += dt * 0.00009;
              sp.y = Math.min(ty, sp.y + sp.vy * dt);
            } else {
              sp.y = ty;
              sp.vy = 0;
            }
          }
          sp.scale += (1 - sp.scale) * Math.min(1, dt / 90);
          let sc = sp.scale;
          if (gem.special === "prism" || gem.special === "bomb") sc *= 1 + 0.05 * Math.sin(now / 160);
          const size = spriteSize * sc;
          const img = gemSprite(gem.color, gem.special, spriteSize);
          ctx.drawImage(img, ox + sp.x * cell + (cell - size) / 2, oy + sp.y * cell + (cell - size) / 2, size, size);
        }
      }
      if (s.swapAnim) {
        s.swapAnim.t += dt / (p.reducedMotion ? 60 : 150);
      }

      // particles
      for (const pt of s.particles) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += dt * 0.00004;
        pt.life -= dt / 600;
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(ox + pt.x * cell, oy + pt.y * cell, pt.size * cell * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      s.particles = s.particles.filter((pt) => pt.life > 0);

      // combo words
      for (const t of s.texts) {
        t.life -= dt / 1100;
        t.y -= dt * 0.0006;
        const a = Math.max(0, Math.min(1, t.life * 2));
        ctx.globalAlpha = a;
        ctx.font = `700 ${Math.round(cell * 0.75)}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = cell * 0.12;
        ctx.strokeStyle = "#3b0a6e";
        ctx.strokeText(t.text, ox + t.x * cell, oy + t.y * cell);
        const g = ctx.createLinearGradient(0, oy + (t.y - 0.6) * cell, 0, oy + t.y * cell);
        g.addColorStop(0, "#FFF3B0");
        g.addColorStop(1, "#FFB703");
        ctx.fillStyle = g;
        ctx.fillText(t.text, ox + t.x * cell, oy + t.y * cell);
      }
      ctx.globalAlpha = 1;
      s.texts = s.texts.filter((t) => t.life > 0);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function animateSteps(steps: Step[], endGrid: Grid) {
    const s = st.current;
    const p = propsRef.current;
    const fast = p.reducedMotion;
    for (const step of steps) {
      for (const { pos, gem } of step.cleared) {
        const color = gem.color >= 0 ? GEM_COLORS[gem.color][0] : "#ffffff";
        const n = fast ? 2 : 7;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 0.002 + Math.random() * 0.004;
          s.particles.push({ x: pos.c + 0.5, y: pos.r + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.002, life: 1, color, size: 0.6 + Math.random() * 0.8 });
        }
        s.sprites.delete(gem.id);
      }
      if (step.blasts.length) {
        s.shake = Math.min(1.5, s.shake + 0.6 * step.blasts.length);
        sfx.blast();
        buzz(hapticPattern("blast", p.haptics));
      } else {
        sfx.pop(step.combo);
        buzz(hapticPattern("match", p.haptics));
      }
      if (step.created.length) sfx.special();
      const word = comboWord(step.combo, step.cleared.length, p.lang);
      if (word) {
        const mid = step.cleared[Math.floor(step.cleared.length / 2)]?.pos ?? { r: 4, c: 4 };
        s.texts.push({ text: word, x: s.grid[0].length / 2, y: Math.max(1.5, mid.r + 0.3), life: 1 });
      }
      s.grid = step.afterClear;
      await wait(fast ? 60 : 170);
      for (const sp of step.spawned) s.sprites.set(sp.id, { x: sp.c, y: sp.startRow, vy: 0, scale: 1 });
      s.grid = step.afterFall;
      await wait(fast ? 80 : 260);
    }
    s.grid = endGrid;
    s.hint = null;
  }

  async function runTurn(play: () => TurnResult, swapPair?: [Pos, Pos]) {
    const s = st.current;
    s.busy = true;
    s.lastInput = performance.now();
    s.hint = null;
    if (swapPair) {
      s.swapAnim = { a: swapPair[0], b: swapPair[1], t: 0, back: false };
      sfx.swap();
    }
    const res = play();
    if (swapPair) {
      if (!res.valid) s.swapAnim!.back = true;
      await wait(propsRef.current.reducedMotion ? 70 : 170);
      s.swapAnim = null;
      if (!res.valid) {
        sfx.invalid();
        s.busy = false;
        return;
      }
    }
    if (res.valid) await animateSteps(res.steps, propsRef.current.getGrid());
    s.grid = propsRef.current.getGrid();
    s.busy = false;
    propsRef.current.onSettled(s.grid);
  }

  function cellAt(clientX: number, clientY: number): Pos | null {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const s = st.current;
    const rows = s.grid.length;
    const cols = s.grid[0].length;
    const ox = (canvas.width - s.cell * cols) / 2;
    const oy = (canvas.height - s.cell * rows) / 2;
    const c = Math.floor(((clientX - rect.left) * scale - ox) / s.cell);
    const r = Math.floor(((clientY - rect.top) * scale - oy) / s.cell);
    return r >= 0 && c >= 0 && r < rows && c < cols ? { r, c } : null;
  }

  function trySwap(a: Pos, b: Pos) {
    st.current.selected = null;
    void runTurn(() => propsRef.current.onSwap(a, b), [a, b]);
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.busy) return;
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    s.lastInput = performance.now();
    buzz(hapticPattern("tap", propsRef.current.haptics));
    if (propsRef.current.hammer) {
      void runTurn(() => propsRef.current.onHammer(pos));
      return;
    }
    if (s.selected && isAdjacent(s.selected, pos)) {
      trySwap(s.selected, pos);
      return;
    }
    s.selected = pos;
    s.drag = { pos, x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.drag || s.busy) return;
    const dx = e.clientX - s.drag.x;
    const dy = e.clientY - s.drag.y;
    const rect = canvasRef.current!.getBoundingClientRect();
    const cellCss = (s.cell * rect.width) / canvasRef.current!.width;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cellCss * 0.35) return;
    const from = s.drag.pos;
    const to = Math.abs(dx) > Math.abs(dy) ? { r: from.r, c: from.c + Math.sign(dx) } : { r: from.r + Math.sign(dy), c: from.c };
    s.drag = null;
    if (to.r >= 0 && to.c >= 0 && to.r < s.grid.length && to.c < s.grid[0].length) trySwap(from, to);
  };

  const onPointerUp = () => {
    st.current.drag = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`board${props.hammer ? " board--hammer" : ""}`}
      role="img"
      aria-label="Game board: drag a gem onto a neighbour to swap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
