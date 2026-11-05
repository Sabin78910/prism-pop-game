import { useEffect, useRef } from "react";
import { findHint, isAdjacent } from "./game/board";
import { hintDelay, learnPace, loadPace, savePace } from "./game/pace";

const paceStore = typeof localStorage !== "undefined" ? localStorage : undefined;
import { GEM_COLORS, gemSprite } from "./game/gemArt";
import { comboWord, hapticPattern, scorePopup } from "./game/feedback";
import { effectProgress, hitStopMs, stepEffects, type Effect } from "./game/effects";
import type { Grid, Pos, Step } from "./game/types";
import type { TurnResult } from "./game/session";
import { sfx } from "./audio";
import { canvasScale, shouldDraw } from "./game/frameGate";

interface Props {
  grid: Grid;
  /** Checkerboard tile colours from the chosen board theme. */
  tiles: [string, string];
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
  /** 1 on landing, decays to 0: a small squash so falling gems feel heavy. */
  squash: number;
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
  /** Font size as a fraction of a cell; combo words are big, score pops are small. */
  size: number;
  score?: boolean;
}

/** Paints the checkered tiles and jelly into the cached board layer. */
function paintBoard(ctx: CanvasRenderingContext2D, tiles: Props["tiles"], jelly: Props["jelly"], rows: number, cols: number, cell: number, ox: number, oy: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;
      ctx.fillStyle = tiles[(r + c) % 2];
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.18);
      ctx.fill();
      const j = jelly[r]?.[c] ?? 0;
      if (j > 0) {
        ctx.fillStyle = j > 1 ? "rgba(255,92,170,0.55)" : "rgba(255,140,200,0.32)";
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, cell - 6, cell - 6, cell * 0.2);
        ctx.fill();
      }
    }
  }
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
    fx: [] as { e: Effect; age: number }[],
    busy: false,
    selected: null as Pos | null,
    drag: null as { pos: Pos; x: number; y: number } | null,
    shake: 0,
    lastInput: performance.now(),
    /** When the previous move started; think time is measured from here. */
    turnAt: performance.now(),
    pace: loadPace(paceStore),
    hint: null as [Pos, Pos] | null,
    swapAnim: null as null | { a: Pos; b: Pos; t: number; back: boolean },
    cell: 40,
    /** Bumped whenever something drawn changes outside the animation loop. */
    version: 0,
  });

  // Adopt a new grid from outside (new level, shuffle) when not animating.
  useEffect(() => {
    const s = st.current;
    if (!s.busy) {
      s.grid = props.grid;
      s.hint = null;
    }
    s.version++;
  }, [props.grid]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const s = st.current;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvasScale(window.devicePixelRatio, navigator.hardwareConcurrency);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const rows = s.grid.length;
      const cols = s.grid[0].length;
      s.cell = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
      boardKey = "";
      s.version++;
    };
    // Tiles and jelly only change between moves, so they are painted once into a layer and blitted.
    const board = document.createElement("canvas");
    const bctx = board.getContext("2d")!;
    let boardKey = "";
    let boardTiles: unknown = null;
    let boardJelly = -1;
    let drawnVersion = -1;
    let drawnKey = "";
    let lastDraw = 0;
    let moving = true;
    let pulsing = false;
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = propsRef.current;
      const hintOn = !s.busy && now - s.lastInput > hintDelay(s.pace);
      const key = `${s.selected?.r},${s.selected?.c}|${s.busy}|${hintOn}|${p.reducedMotion}`;
      const animating = moving || !!s.swapAnim || s.fx.length > 0 || s.particles.length > 0 || s.texts.length > 0 || s.shake > 0;
      // Jelly is cleared in place, so its layer is keyed on what is left rather than on the array.
      let jellyLeft = 0;
      for (const row of p.jelly) for (const j of row) jellyLeft += j;
      const changed = jellyLeft !== boardJelly || key !== drawnKey || s.version !== drawnVersion || p.tiles !== boardTiles;
      if (!shouldDraw({ animating, pulsing: pulsing || (hintOn && !!s.hint), changed, sinceDraw: now - lastDraw })) {
        last = now;
        return;
      }
      drawnKey = key;
      drawnVersion = s.version;
      lastDraw = now;
      const dt = Math.min(48, now - last);
      last = now;
      const cell = s.cell;
      const rows = s.grid.length;
      const cols = s.grid[0].length;
      const ox = (canvas.width - cell * cols) / 2;
      const oy = (canvas.height - cell * rows) / 2;
      const bk = `${canvas.width}x${canvas.height}|${cell}`;
      if (bk !== boardKey || p.tiles !== boardTiles || jellyLeft !== boardJelly) {
        boardKey = bk;
        boardTiles = p.tiles;
        boardJelly = jellyLeft;
        board.width = canvas.width;
        board.height = canvas.height;
        paintBoard(bctx, p.tiles, p.jelly, rows, cols, cell, ox, oy);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (s.shake > 0 && !p.reducedMotion) {
        ctx.translate((Math.random() - 0.5) * s.shake * cell * 0.15, (Math.random() - 0.5) * s.shake * cell * 0.15);
      }
      s.shake = Math.max(0, s.shake - dt / 250);

      ctx.drawImage(board, 0, 0);

      // selection + hint glow
      const glow = (q: Pos, alpha: number) => {
        ctx.fillStyle = `rgba(255,209,102,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(ox + q.c * cell + 2, oy + q.r * cell + 2, cell - 4, cell - 4, cell * 0.2);
        ctx.fill();
      };
      if (s.selected) glow(s.selected, 0.35);
      if (!s.busy && now - s.lastInput > hintDelay(s.pace)) {
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
      moving = false;
      pulsing = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gem = s.grid[r][c];
          if (!gem) continue;
          let sp = s.sprites.get(gem.id);
          if (!sp) {
            sp = { x: c, y: r, vy: 0, scale: 0.2, squash: 0 };
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
              if (sp.vy > 0.002) sp.squash = 1;
              sp.y = ty;
              sp.vy = 0;
            }
          }
          sp.scale += (1 - sp.scale) * Math.min(1, dt / 90);
          let sc = sp.scale;
          if (gem.special === "prism" || gem.special === "bomb") {
            sc *= 1 + 0.05 * Math.sin(now / 160);
            pulsing = true;
          }
          sp.squash = Math.max(0, sp.squash - dt / 140);
          if (Math.abs(sp.x - tx) > 0.001 || Math.abs(sp.y - ty) > 0.001 || 1 - sp.scale > 0.002 || sp.squash > 0) moving = true;
          const w = spriteSize * sc * (1 + 0.1 * sp.squash);
          const h = spriteSize * sc * (1 - 0.14 * sp.squash);
          const img = gemSprite(gem.color, gem.special, spriteSize);
          // Squash anchors at the bottom of the cell so the gem looks like it lands, not shrinks.
          ctx.drawImage(img, ox + sp.x * cell + (cell - w) / 2, oy + sp.y * cell + cell - (cell - spriteSize * sc) / 2 - h, w, h);
          if (gem.ice) {
            // Frosted block over the gem; a second layer is thicker. White rim keeps it readable without colour.
            const ix = ox + sp.x * cell + 3;
            const iy = oy + sp.y * cell + 3;
            ctx.fillStyle = gem.ice > 1 ? "rgba(190,230,255,0.62)" : "rgba(190,230,255,0.38)";
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = gem.ice > 1 ? 3 : 1.5;
            ctx.beginPath();
            ctx.roundRect(ix, iy, cell - 6, cell - 6, cell * 0.16);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ix + cell * 0.18, iy + cell * 0.22);
            ctx.lineTo(ix + cell * 0.38, iy + cell * 0.1);
            ctx.stroke();
          }
        }
      }
      if (s.swapAnim) {
        s.swapAnim.t += dt / (p.reducedMotion ? 60 : 150);
      }

      // blast effects: beams, shockwaves, prism rays, creation flashes
      for (const f of s.fx) {
        f.age += dt / 1000;
        const { e } = f;
        const k = effectProgress(f.age, e.duration);
        const fade = 1 - Math.min(1, f.age / e.duration);
        const geo = p.reducedMotion ? 0.5 : k;
        const cx = ox + e.c * cell;
        const cy = oy + e.r * cell;
        ctx.globalAlpha = fade;
        if (e.kind === "beamH" || e.kind === "beamV") {
          const thick = cell * (0.95 - 0.7 * geo);
          const horizontal = e.kind === "beamH";
          const g = horizontal
            ? ctx.createLinearGradient(0, cy - thick / 2, 0, cy + thick / 2)
            : ctx.createLinearGradient(cx - thick / 2, 0, cx + thick / 2, 0);
          g.addColorStop(0, "rgba(120,220,255,0)");
          g.addColorStop(0.5, "rgba(255,255,255,0.95)");
          g.addColorStop(1, "rgba(120,220,255,0)");
          ctx.fillStyle = g;
          if (horizontal) ctx.fillRect(ox, cy - thick / 2, cols * cell, thick);
          else ctx.fillRect(cx - thick / 2, oy, thick, rows * cell);
        } else if (e.kind === "ring" && !p.reducedMotion) {
          ctx.strokeStyle = "rgba(255,226,140,1)";
          ctx.lineWidth = Math.max(1, cell * 0.28 * (1 - k));
          ctx.beginPath();
          ctx.arc(cx, cy, cell * (0.3 + 2.4 * k), 0, Math.PI * 2);
          ctx.stroke();
        } else if (e.kind === "rays" && !p.reducedMotion) {
          ctx.lineWidth = cell * 0.12;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + k * 0.7;
            ctx.strokeStyle = `hsl(${i * 30}, 95%, 70%)`;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * cell * 0.4, cy + Math.sin(a) * cell * 0.4);
            ctx.lineTo(cx + Math.cos(a) * cell * (0.6 + 6 * k), cy + Math.sin(a) * cell * (0.6 + 6 * k));
            ctx.stroke();
          }
        } else if (e.kind === "flash") {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(cx, cy, cell * (0.3 + 0.5 * geo), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      s.fx = s.fx.filter((f) => f.age < f.e.duration);

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
        t.life -= dt / (t.score ? 800 : 1100);
        t.y -= dt * (t.score ? 0.0012 : 0.0006);
        const a = Math.max(0, Math.min(1, t.life * 2));
        ctx.globalAlpha = a;
        // Pops in with a little overshoot, then settles.
        const pop = p.reducedMotion ? 1 : 1 + 0.35 * Math.max(0, t.life - 0.8) * 5;
        ctx.font = `700 ${Math.round(cell * t.size * pop)}px Fredoka, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.lineWidth = cell * 0.12;
        ctx.strokeStyle = "#3b0a6e";
        ctx.strokeText(t.text, ox + t.x * cell, oy + t.y * cell);
        const g = ctx.createLinearGradient(0, oy + (t.y - 0.6) * cell, 0, oy + t.y * cell);
        g.addColorStop(0, t.score ? "#FFFFFF" : "#FFF3B0");
        g.addColorStop(1, t.score ? "#C9F2FF" : "#FFB703");
        ctx.fillStyle = g;
        ctx.fillText(t.text, ox + t.x * cell, oy + t.y * cell);
      }
      ctx.globalAlpha = 1;
      s.texts = s.texts.filter((t) => t.life > 0);
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
      // Hit-stop: hold the frame a beat before a blast lands, so the impact reads.
      const stop = hitStopMs(step.blasts.length, fast);
      if (stop) await wait(stop);
      s.fx.push(...stepEffects(step).map((e) => ({ e, age: 0 })));
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
      for (const { pos } of step.thawed) {
        for (let i = 0; i < (fast ? 2 : 6); i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 0.002 + Math.random() * 0.003;
          s.particles.push({ x: pos.c + 0.5, y: pos.r + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.002, life: 1, color: "#dff4ff", size: 0.5 + Math.random() * 0.6 });
        }
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
        s.texts.push({ text: word, x: s.grid[0].length / 2, y: Math.max(1.5, mid.r + 0.3), life: 1, size: 0.75 });
      }
      // The points appear where they were earned, so the reward lands at the point of action.
      const popup = scorePopup(step.score, step.combo);
      if (popup && step.cleared.length) {
        const cx = step.cleared.reduce((a, q) => a + q.pos.c, 0) / step.cleared.length + 0.5;
        const cy = step.cleared.reduce((a, q) => a + q.pos.r, 0) / step.cleared.length + 0.5;
        s.texts.push({ text: popup.text, x: cx, y: cy, life: 1, size: popup.scale, score: true });
      }
      s.grid = step.afterClear;
      s.version++;
      await wait(fast ? 60 : 170);
      for (const sp of step.spawned) s.sprites.set(sp.id, { x: sp.c, y: sp.startRow, vy: 0, scale: 1, squash: 0 });
      s.grid = step.afterFall;
      s.version++;
      await wait(fast ? 80 : 260);
    }
    s.grid = endGrid;
    s.version++;
    s.hint = null;
  }

  async function runTurn(play: () => TurnResult, swapPair?: [Pos, Pos]) {
    const s = st.current;
    s.busy = true;
    s.lastInput = performance.now();
    s.hint = null;
    if (swapPair) {
      s.pace = learnPace(s.pace, s.lastInput - s.turnAt);
      s.turnAt = s.lastInput;
      savePace(paceStore, s.pace);
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
    s.version++;
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
